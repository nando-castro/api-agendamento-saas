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

  private readonly PAYMENT_WINDOW_MINUTES = 30;

  private async expireOldPendingBookings(tenantId: string) {
    await this.prisma.booking.updateMany({
      where: {
        tenantId,
        status: 'PENDING_PAYMENT',
        expiresAt: { not: null, lt: new Date() },
      },
      data: { status: 'EXPIRED' },
    });
  }

  async create(tenantId: string, dto: CreateBookingDto) {
    // ✅ garante que pendências antigas não bloqueiem horário
    await this.expireOldPendingBookings(tenantId);

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
    if (bh.length === 0) {
      throw new BadRequestException(
        'Sem horário de funcionamento para este dia.',
      );
    }

    const withinBusinessHours = bh.some((h) => {
      const [sh, sm] = h.startTime.split(':').map(Number);
      const [eh, em] = h.endTime.split(':').map(Number);

      const day = start.startOf('day');
      const ws = day.set({ hour: sh, minute: sm, second: 0, millisecond: 0 });
      const we = day.set({ hour: eh, minute: em, second: 0, millisecond: 0 });

      return start >= ws && end <= we;
    });

    if (!withinBusinessHours) {
      throw new BadRequestException('Fora do horário de funcionamento.');
    }

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
    // ✅ não considera CANCELLED / EXPIRED
    // ✅ e também ignora PENDING_PAYMENT já expirado (mesmo se ainda não foi atualizado)
    const existing = await this.prisma.booking.findMany({
      where: {
        tenantId,
        startAt: { lt: end.toJSDate() },
        endAt: { gt: start.toJSDate() },
        status: { notIn: ['CANCELLED', 'EXPIRED'] },
      },
      select: {
        startAt: true,
        endAt: true,
        status: true,
        expiresAt: true,
      },
    });

    const now = new Date();
    const conflict = existing.some((b) => {
      if (b.status === 'PENDING_PAYMENT' && b.expiresAt && b.expiresAt < now) {
        return false; // não bloqueia, já expirou
      }
      return overlaps(start.toJSDate(), end.toJSDate(), b.startAt, b.endAt);
    });

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

    // ✅ regra: se tem sinal > 0, exige pagamento
    const requiresPayment = signalAmountCents > 0;

    const status = requiresPayment ? 'PENDING_PAYMENT' : 'CONFIRMED';
    const expiresAt = requiresPayment
      ? new Date(Date.now() + this.PAYMENT_WINDOW_MINUTES * 60 * 1000)
      : null;

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
        status,
        totalPriceCents,
        signalPercentApplied,
        signalAmountCents,
        expiresAt,
      },
      include: {
        service: true,
        customer: true,
      },
    });
  }

  async list(tenantId: string, fromIso: string, toIso: string) {
    // ✅ mantém a lista “limpa” também
    await this.expireOldPendingBookings(tenantId);

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

  // ✅ NOVO: usado pelo público pra polling
  async getByIdForPublic(tenantId: string, bookingId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, tenantId },
      include: { service: true, customer: true },
    });

    if (!booking) throw new NotFoundException('Agendamento não encontrado.');
    return booking;
  }

  // ✅ NOVO: rollback quando PIX falhar
  async cancelPendingByPublic(tenantId: string, bookingId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, tenantId },
      select: { id: true, status: true },
    });

    if (!booking) throw new NotFoundException('Agendamento não encontrado.');

    if (booking.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException(
        'Só é possível cancelar agendamentos aguardando pagamento.',
      );
    }

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED', expiresAt: null },
    });

    return { ok: true };
  }
}
