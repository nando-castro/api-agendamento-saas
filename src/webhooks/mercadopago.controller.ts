// src/webhooks/mercadopago.controller.ts
import { Body, Controller, Headers, Post, Query } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { IncomingHttpHeaders } from 'http';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';

type MpWebhookBody = {
  id?: string | number;
  data?: { id?: string | number };
  type?: string;
  action?: string;
};

type QueryParams = Record<string, string | string[] | undefined>;

function toStr(v: unknown): string | undefined {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
  return undefined;
}

@Controller('webhooks/mercadopago')
export class MercadoPagoWebhookController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
  ) {}

  @Post()
  async handle(
    @Body() body: MpWebhookBody,
    @Query() query: QueryParams,
    @Headers() headers: IncomingHttpHeaders,
  ) {
    const mpPaymentId =
      toStr(body.data?.id) ??
      toStr(body.id) ??
      toStr(query['data.id']) ??
      toStr(query.id);

    const requestId = toStr(headers['x-request-id']) ?? 'no-reqid';
    const eventKey = `MP:${mpPaymentId ?? 'no-id'}:${requestId}`;

    const payload = body as unknown as Prisma.InputJsonValue;

    try {
      await this.prisma.webhookEvent.create({
        data: { provider: 'MERCADOPAGO', eventKey, payload },
      });
    } catch {
      return { ok: true };
    }

    if (!mpPaymentId) return { ok: true };

    const mp = await this.payments.fetchMpPayment(mpPaymentId);
    if (!mp?.status) return { ok: true };

    const status = mp.status;
    const statusDetail = mp.status_detail ?? null;
    const externalRef = mp.external_reference ?? null;

    const payment = await this.prisma.payment.update({
      where: { mpPaymentId },
      data: { status, statusDetail },
    });

    if (status === 'approved') {
      if (externalRef && externalRef !== String(payment.bookingId)) {
        return { ok: true };
      }

      await this.prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: 'CONFIRMED' },
      });
    }

    return { ok: true };
  }
}
