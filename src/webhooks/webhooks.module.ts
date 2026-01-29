// src/webhooks/webhooks.module.ts
import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { PrismaService } from '../prisma/prisma.service';
import { MercadoPagoWebhookController } from './mercadopago.controller';

@Module({
  imports: [PaymentsModule],
  controllers: [MercadoPagoWebhookController],
  providers: [PrismaService],
})
export class WebhooksModule {}
