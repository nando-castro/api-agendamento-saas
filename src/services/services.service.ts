import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateServiceDto) {
    return this.prisma.service.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        durationMinutes: dto.durationMinutes,
        priceCents: dto.priceCents,
        signalPercentOverride: dto.signalPercentOverride ?? null,
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
        active: dto.active,
      },
    });
  }

  async toggle(tenantId: string, id: string) {
    const svc = await this.prisma.service.findFirst({
      where: { id, tenantId },
    });
    if (!svc) throw new NotFoundException('Serviço não encontrado.');

    return this.prisma.service.update({
      where: { id },
      data: { active: !svc.active },
    });
  }
}
