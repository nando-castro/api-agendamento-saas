import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(tenantId: string) {
    const t = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        timezone: true,
        slotIntervalMinutes: true,
        signalPercentDefault: true,
        createdAt: true,
      },
    });
    if (!t) throw new NotFoundException('Tenant não encontrado.');
    return t;
  }
}
