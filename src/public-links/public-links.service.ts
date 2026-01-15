import { Injectable, NotFoundException } from '@nestjs/common';
import { nanoid } from 'nanoid';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PublicLinksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, serviceId?: string) {
    if (serviceId) {
      const svc = await this.prisma.service.findFirst({
        where: { id: serviceId, tenantId, active: true },
      });
      if (!svc) throw new NotFoundException('Serviço não encontrado.');
    }

    const token = nanoid(16);

    return this.prisma.bookingLink.create({
      data: {
        tenantId,
        token,
        serviceId: serviceId ?? null,
        active: true,
      },
    });
  }

  list(tenantId: string) {
    return this.prisma.bookingLink.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: { service: true },
    });
  }

  async toggle(tenantId: string, id: string) {
    const link = await this.prisma.bookingLink.findFirst({
      where: { id, tenantId },
    });
    if (!link) throw new NotFoundException('Link não encontrado.');

    return this.prisma.bookingLink.update({
      where: { id },
      data: { active: !link.active },
      include: { service: true },
    });
  }
}
