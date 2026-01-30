import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
