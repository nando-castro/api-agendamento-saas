import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  private isValidHHmm(t: string) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(t ?? '');
  }

  private hhmmToMinutes(t: string) {
    const [h, m] = (t ?? '00:00').split(':').map((x) => Number(x));
    return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
  }

  /**
   * ✅ Ajuste o model abaixo para o SEU Prisma:
   * - pode ser prisma.businessHour, prisma.scheduleBusinessHour, etc.
   * - precisa ter tenantId, active, startTime, endTime
   */
  private async hasValidBusinessHours(tenantId: string) {
    const items = await this.prisma.businessHour.findMany({
      where: { tenantId },
      select: { active: true, startTime: true, endTime: true },
    });

    return (items ?? []).some((i) => {
      if (!i.active) return false;
      if (!this.isValidHHmm(i.startTime) || !this.isValidHHmm(i.endTime))
        return false;
      return this.hhmmToMinutes(i.startTime) < this.hhmmToMinutes(i.endTime);
    });
  }

  async create(tenantId: string, dto: CreateServiceDto) {
    const hoursOk = await this.hasValidBusinessHours(tenantId);

    // regra: se não tiver expediente válido, nasce inativo (mesmo que o front mande true)
    const desiredActive = dto.active ?? false;
    const active = hoursOk ? desiredActive : false;

    return this.prisma.service.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        durationMinutes: dto.durationMinutes,
        priceCents: dto.priceCents,
        signalPercentOverride: dto.signalPercentOverride ?? null,
        active, // ✅ agora controla
      },
    });
  }

  list(tenantId: string) {
    return this.prisma.service.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateServiceDto) {
    const exists = await this.prisma.service.findFirst({
      where: { id, tenantId },
    });
    if (!exists) throw new NotFoundException('Serviço não encontrado.');

    // ✅ se está tentando ativar via update, valida expediente
    if (dto.active === true) {
      const hoursOk = await this.hasValidBusinessHours(tenantId);
      if (!hoursOk) {
        throw new BadRequestException(
          'Configure ao menos um horário de funcionamento (Expediente) antes de ativar o serviço.',
        );
      }
    }

    return this.prisma.service.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        durationMinutes: dto.durationMinutes,
        priceCents: dto.priceCents,
        signalPercentOverride:
          dto.signalPercentOverride === undefined
            ? undefined
            : dto.signalPercentOverride,
        active: dto.active, // ok (se vier undefined, prisma ignora)
      },
    });
  }

  async toggle(tenantId: string, id: string) {
    const svc = await this.prisma.service.findFirst({
      where: { id, tenantId },
    });
    if (!svc) throw new NotFoundException('Serviço não encontrado.');

    // ✅ vai ativar? então valida antes
    if (!svc.active) {
      const hoursOk = await this.hasValidBusinessHours(tenantId);
      if (!hoursOk) {
        throw new BadRequestException(
          'Configure ao menos um horário de funcionamento (Expediente) antes de ativar o serviço.',
        );
      }
    }

    return this.prisma.service.update({
      where: { id },
      data: { active: !svc.active },
    });
  }
}
