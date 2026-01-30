// src/dev/dev.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DevService {
  constructor(private readonly prisma: PrismaService) {}

  async approvePayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, bookingId: true, status: true },
    });

    if (!payment) throw new NotFoundException('Payment não encontrado.');

    // opcional: evita aprovar algo já aprovado
    if (payment.status === 'approved') {
      return { ok: true, message: 'Payment já estava aprovado.' };
    }

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'approved', statusDetail: 'dev_mock' },
      }),
      this.prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: 'CONFIRMED', expiresAt: null },
      }),
    ]);

    return { ok: true };
  }

  async rejectPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, bookingId: true, status: true },
    });

    if (!payment) throw new NotFoundException('Payment não encontrado.');

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'rejected', statusDetail: 'dev_mock' },
      }),
      // regra sugerida: volta booking pra pendente e deixa expirar normalmente
      this.prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: 'PENDING_PAYMENT' },
      }),
    ]);

    return { ok: true };
  }

  async expireBooking(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true },
    });

    if (!booking) throw new NotFoundException('Booking não encontrado.');

    if (booking.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException('Booking não está em PENDING_PAYMENT.');
    }

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'EXPIRED', expiresAt: new Date() },
    });

    return { ok: true };
  }
}
