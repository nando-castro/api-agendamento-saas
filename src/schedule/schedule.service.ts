import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  getBusinessHours(tenantId: string) {
    return this.prisma.businessHour.findMany({
      where: { tenantId },
      orderBy: { weekday: 'asc' },
    });
  }

  async setBusinessHours(
    tenantId: string,
    items: Array<{
      weekday: number;
      startTime: string;
      endTime: string;
      active: boolean;
    }>,
  ) {
    await this.prisma.$transaction([
      this.prisma.businessHour.deleteMany({ where: { tenantId } }),
      this.prisma.businessHour.createMany({
        data: items.map((i) => ({
          tenantId,
          weekday: i.weekday,
          startTime: i.startTime,
          endTime: i.endTime,
          active: i.active,
        })),
      }),
    ]);

    return this.getBusinessHours(tenantId);
  }

  async createBlock(
    tenantId: string,
    startAt: Date,
    endAt: Date,
    reason?: string,
  ) {
    if (endAt <= startAt) {
      throw new BadRequestException('endAt deve ser maior que startAt.');
    }

    return this.prisma.scheduleBlock.create({
      data: { tenantId, startAt, endAt, reason: reason?.trim() || null },
    });
  }

  listBlocks(tenantId: string, from: Date, to: Date) {
    return this.prisma.scheduleBlock.findMany({
      where: {
        tenantId,
        OR: [{ startAt: { lt: to }, endAt: { gt: from } }],
      },
      orderBy: { startAt: 'asc' },
    });
  }

  async deleteBlock(tenantId: string, id: string) {
    const blk = await this.prisma.scheduleBlock.findFirst({
      where: { id, tenantId },
    });
    if (!blk) throw new NotFoundException('Bloqueio não encontrado.');
    await this.prisma.scheduleBlock.delete({ where: { id } });
    return { ok: true };
  }
}
