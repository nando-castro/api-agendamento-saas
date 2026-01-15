import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DateTime, Interval } from 'luxon';
import { PrismaService } from '../prisma/prisma.service';

type Range = { start: DateTime; end: DateTime };

function overlaps(a: Range, b: Range): boolean {
  return a.start < b.end && a.end > b.start;
}

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async getDailySlots(tenantId: string, serviceId: string, date: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant não encontrado.');

    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, tenantId, active: true },
    });
    if (!service) throw new NotFoundException('Serviço não encontrado.');

    const zone = tenant.timezone || 'America/Fortaleza';
    const day = DateTime.fromISO(date, { zone });
    if (!day.isValid) throw new BadRequestException('Data inválida.');

    const weekday0Sunday = day.weekday % 7; // Luxon: 1=Mon..7=Sun => 0=Sun..6=Sat
    const businessHours = await this.prisma.businessHour.findMany({
      where: { tenantId, weekday: weekday0Sunday, active: true },
    });

    if (businessHours.length === 0) {
      return {
        date,
        timezone: zone,
        serviceId,
        durationMinutes: service.durationMinutes,
        slotIntervalMinutes: tenant.slotIntervalMinutes,
        slots: [],
      };
    }

    const dayStart = day.startOf('day');
    const dayEnd = day.endOf('day').plus({ millisecond: 1 });

    // Buscar bloqueios e agendamentos que intersectam o dia
    const [blocks, bookings] = await Promise.all([
      this.prisma.scheduleBlock.findMany({
        where: {
          tenantId,
          startAt: { lt: dayEnd.toJSDate() },
          endAt: { gt: dayStart.toJSDate() },
        },
        orderBy: { startAt: 'asc' },
      }),
      this.prisma.booking.findMany({
        where: {
          tenantId,
          startAt: { lt: dayEnd.toJSDate() },
          endAt: { gt: dayStart.toJSDate() },
          status: { notIn: ['CANCELLED', 'EXPIRED'] },
        },
        orderBy: { startAt: 'asc' },
      }),
    ]);

    const blockedRanges: Range[] = blocks.map((b) => ({
      start: DateTime.fromJSDate(b.startAt, { zone }),
      end: DateTime.fromJSDate(b.endAt, { zone }),
    }));

    const bookedRanges: Range[] = bookings.map((b) => ({
      start: DateTime.fromJSDate(b.startAt, { zone }),
      end: DateTime.fromJSDate(b.endAt, { zone }),
    }));

    const now = DateTime.now().setZone(zone);
    const slotInterval = tenant.slotIntervalMinutes;
    const duration = service.durationMinutes;

    // Janela de trabalho pode ser múltipla (ex: manhã e tarde no futuro)
    const workRanges: Range[] = businessHours.map((h) => {
      const [sh, sm] = h.startTime.split(':').map(Number);
      const [eh, em] = h.endTime.split(':').map(Number);

      const start = day.set({
        hour: sh,
        minute: sm,
        second: 0,
        millisecond: 0,
      });
      const end = day.set({ hour: eh, minute: em, second: 0, millisecond: 0 });

      return { start, end };
    });

    const slots: Array<{ startAt: string; endAt: string }> = [];

    for (const wr of workRanges) {
      // segurança: se end <= start, ignora
      if (wr.end <= wr.start) continue;

      // iterate no intervalo em passos de slotInterval
      let cursor = wr.start;

      while (cursor.plus({ minutes: duration }) <= wr.end) {
        const slot: Range = {
          start: cursor,
          end: cursor.plus({ minutes: duration }),
        };

        // não permitir horários passados (no dia de hoje)
        if (
          slot.start < now &&
          Interval.fromDateTimes(dayStart, dayEnd).contains(now)
        ) {
          cursor = cursor.plus({ minutes: slotInterval });
          continue;
        }

        const isBlocked =
          blockedRanges.some((b) => overlaps(slot, b)) ||
          bookedRanges.some((b) => overlaps(slot, b));

        if (!isBlocked) {
          slots.push({
            startAt: slot.start.toISO()!,
            endAt: slot.end.toISO()!,
          });
        }

        cursor = cursor.plus({ minutes: slotInterval });
      }
    }

    return {
      date,
      timezone: zone,
      serviceId,
      durationMinutes: duration,
      slotIntervalMinutes: slotInterval,
      slots,
    };
  }
}
