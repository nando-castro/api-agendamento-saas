// src/dev/dev.controller.ts
import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { DevService } from './dev.service';
import { DevOnlyGuard } from './guards/dev-only.guard';

@UseGuards(DevOnlyGuard)
@Controller('dev')
export class DevController {
  constructor(private readonly dev: DevService) {}

  @Post('payments/:paymentId/approve')
  approve(@Param('paymentId') paymentId: string) {
    return this.dev.approvePayment(paymentId);
  }

  @Post('payments/:paymentId/reject')
  reject(@Param('paymentId') paymentId: string) {
    return this.dev.rejectPayment(paymentId);
  }

  @Post('bookings/:bookingId/expire')
  expire(@Param('bookingId') bookingId: string) {
    return this.dev.expireBooking(bookingId);
  }
}
