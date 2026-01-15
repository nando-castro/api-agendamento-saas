import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DateTime } from 'luxon';
import { nanoid } from 'nanoid';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateBookingDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant não encontrado.');

    const service = await this.prisma.service.findFirst({
      where: { id: dto.serviceId, tenantId, active: true },
    });
    if (!service) throw new NotFoundException('Serviço não encontrado.');

    const zone = tenant.timezone || 'America/Fortaleza';
    const start = DateTime.fromISO(dto.startAt, { setZone: true }).setZone(
      zone,
    );
    if (!start.isValid) throw new BadRequestException('startAt inválido.');

    const end = start.plus({ minutes: service.durationMinutes });

    // Valida se está dentro do horário de funcionamento
    const weekday0Sunday = start.weekday % 7;
    const bh = await this.prisma.businessHour.findMany({
      where: { tenantId, weekday: weekday0Sunday, active: true },
    });
    if (bh.length === 0)
      throw new BadRequestException(
        'Sem horário de funcionamento para este dia.',
      );

    const withinBusinessHours = bh.some((h) => {
      const [sh, sm] = h.startTime.split(':').map(Number);
      const [eh, em] = h.endTime.split(':').map(Number);

      const day = start.startOf('day');
      const ws = day.set({ hour: sh, minute: sm, second: 0, millisecond: 0 });
      const we = day.set({ hour: eh, minute: em, second: 0, millisecond: 0 });

      return start >= ws && end <= we;
    });

    if (!withinBusinessHours)
      throw new BadRequestException('Fora do horário de funcionamento.');

    // Conflito com bloqueios
    const blocks = await this.prisma.scheduleBlock.findMany({
      where: {
        tenantId,
        startAt: { lt: end.toJSDate() },
        endAt: { gt: start.toJSDate() },
      },
    });

    const blocked = blocks.some((b) =>
      overlaps(start.toJSDate(), end.toJSDate(), b.startAt, b.endAt),
    );
    if (blocked)
      throw new BadRequestException('Horário indisponível (bloqueio).');

    // Conflito com bookings existentes
    const existing = await this.prisma.booking.findMany({
      where: {
        tenantId,
        startAt: { lt: end.toJSDate() },
        endAt: { gt: start.toJSDate() },
        status: { notIn: ['CANCELLED', 'EXPIRED'] },
      },
    });

    const conflict = existing.some((b) =>
      overlaps(start.toJSDate(), end.toJSDate(), b.startAt, b.endAt),
    );
    if (conflict)
      throw new BadRequestException('Horário indisponível (já reservado).');

    // Customer: reaproveita por (tenantId + phone) se existir
    const phone = dto.customer.phone.trim();
    const customer =
      (await this.prisma.customer.findFirst({ where: { tenantId, phone } })) ??
      (await this.prisma.customer.create({
        data: {
          tenantId,
          name: dto.customer.name.trim(),
          phone,
          email: dto.customer.email?.trim() || null,
        },
      }));

    // Preços e sinal
    const totalPriceCents = service.priceCents;
    const signalPercentApplied =
      service.signalPercentOverride ?? tenant.signalPercentDefault ?? 0;

    const signalAmountCents = Math.round(
      (totalPriceCents * signalPercentApplied) / 100,
    );

    // code único
    const code = nanoid(10);

    return this.prisma.booking.create({
      data: {
        tenantId,
        serviceId: service.id,
        customerId: customer.id,
        code,
        startAt: start.toJSDate(),
        endAt: end.toJSDate(),
        status: 'CONFIRMED',
        totalPriceCents,
        signalPercentApplied,
        signalAmountCents,
        expiresAt: null,
      },
      include: {
        service: true,
        customer: true,
      },
    });
  }

  list(tenantId: string, fromIso: string, toIso: string) {
    return this.prisma.booking.findMany({
      where: {
        tenantId,
        startAt: { gte: new Date(fromIso) },
        endAt: { lte: new Date(toIso) },
      },
      orderBy: { startAt: 'asc' },
      include: {
        service: true,
        customer: true,
      },
    });
  }
}
