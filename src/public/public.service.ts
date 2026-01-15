import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveToken(token: string) {
    const link = await this.prisma.bookingLink.findUnique({
      where: { token },
      include: { tenant: true, service: true },
    });

    if (!link || !link.active)
      throw new NotFoundException('Link inválido ou inativo.');

    return link; // tem tenantId e possivelmente serviceId
  }

  async listServices(token: string) {
    const link = await this.resolveToken(token);

    if (link.serviceId) {
      const svc = await this.prisma.service.findFirst({
        where: { id: link.serviceId, tenantId: link.tenantId, active: true },
      });
      if (!svc) throw new NotFoundException('Serviço indisponível.');
      return [svc];
    }

    return this.prisma.service.findMany({
      where: { tenantId: link.tenantId, active: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
