// src/payments/payments.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePixDto, PaymentIntentDto } from './dto/create-pix.dto';

type MpCreatePaymentResponse = {
  id: number;
  status: string;
  status_detail?: string;
  date_of_expiration?: string;
  external_reference?: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
};

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  private getAccessToken() {
    const t = process.env.MP_ACCESS_TOKEN;
    if (!t) throw new Error('MP_ACCESS_TOKEN não configurado');
    return t;
  }

  async createPix(dto: CreatePixDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { customer: true },
    });

    if (!booking) throw new NotFoundException('Booking não encontrado');

    // Se você quiser bloquear pagamento fora do estado esperado:
    if (booking.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException(
        'Este agendamento não está aguardando pagamento.',
      );
    }

    if (booking.expiresAt && booking.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Agendamento expirado.');
    }

    const intent = dto.intent ?? PaymentIntentDto.SIGNAL;

    const amountCents =
      intent === PaymentIntentDto.SIGNAL
        ? booking.signalAmountCents
        : booking.totalPriceCents;

    if (!amountCents || amountCents <= 0) {
      throw new BadRequestException('Valor inválido para cobrança.');
    }

    // evita criar 2 cobranças pendentes pro mesmo booking (opcional)
    const existing = await this.prisma.payment.findFirst({
      where: {
        bookingId: booking.id,
        provider: 'MERCADOPAGO',
        method: 'PIX',
        intent,
        status: 'pending',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing?.qrCodeBase64 || existing?.qrCode) {
      return {
        paymentId: existing.id,
        mpPaymentId: existing.mpPaymentId,
        status: existing.status,
        expiresAt: existing.expiresAt,
        qrCode: existing.qrCode,
        qrCodeBase64: existing.qrCodeBase64,
        ticketUrl: existing.ticketUrl,
      };
    }

    const idempotencyKey = randomUUID();
    const payerEmail = dto.payerEmail ?? booking.customer.email ?? undefined;

    if (!payerEmail) {
      throw new BadRequestException(
        'Informe um e-mail do pagador (payerEmail).',
      );
    }

    const body = {
      transaction_amount: amountCents / 100,
      description: `Pagamento (${intent}) booking ${booking.id}`,
      payment_method_id: 'pix',
      installments: 1,
      payer: { email: payerEmail },
      external_reference: booking.id,
      notification_url: process.env.MP_WEBHOOK_URL,
      // opcional: expiração no MP
      // date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };

    const res = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.getAccessToken()}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new BadRequestException(`Mercado Pago (${res.status}): ${txt}`);
    }

    const mp = (await res.json()) as MpCreatePaymentResponse;
    const tx = mp.point_of_interaction?.transaction_data;

    const payment = await this.prisma.payment.create({
      data: {
        tenantId: booking.tenantId,
        bookingId: booking.id,
        provider: 'MERCADOPAGO',
        method: 'PIX',
        intent: intent === PaymentIntentDto.SIGNAL ? 'SIGNAL' : 'TOTAL',
        amountCents,
        status: mp.status,
        statusDetail: mp.status_detail ?? null,
        mpPaymentId: String(mp.id),
        mpIdempotencyKey: idempotencyKey,
        mpExternalRef: mp.external_reference ?? booking.id,
        qrCode: tx?.qr_code ?? null,
        qrCodeBase64: tx?.qr_code_base64 ?? null,
        ticketUrl: tx?.ticket_url ?? null,
        expiresAt: mp.date_of_expiration
          ? new Date(mp.date_of_expiration)
          : null,
      },
    });

    return {
      paymentId: payment.id,
      mpPaymentId: payment.mpPaymentId,
      status: payment.status,
      expiresAt: payment.expiresAt,
      qrCode: payment.qrCode,
      qrCodeBase64: payment.qrCodeBase64,
      ticketUrl: payment.ticketUrl,
    };
  }

  async fetchMpPayment(
    mpPaymentId: string,
  ): Promise<MpCreatePaymentResponse | null> {
    const res = await fetch(
      `https://api.mercadopago.com/v1/payments/${mpPaymentId}`,
      {
        headers: { Authorization: `Bearer ${this.getAccessToken()}` },
      },
    );

    if (!res.ok) return null;

    const data: unknown = await res.json();
    return data as MpCreatePaymentResponse;
  }
}
