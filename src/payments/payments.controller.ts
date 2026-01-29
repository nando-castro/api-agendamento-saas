// src/payments/payments.controller.ts
import { Body, Controller, Post } from '@nestjs/common';
import { CreatePixDto } from './dto/create-pix.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Post('pix')
  createPix(@Body() dto: CreatePixDto) {
    return this.service.createPix(dto);
  }
}
