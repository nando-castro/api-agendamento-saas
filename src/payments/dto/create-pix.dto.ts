// src/payments/dto/create-pix.dto.ts
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export enum PaymentIntentDto {
  SIGNAL = 'SIGNAL',
  TOTAL = 'TOTAL',
}

export class CreatePixDto {
  @IsString()
  bookingId!: string;

  @IsOptional()
  @IsEmail()
  payerEmail?: string;

  @IsOptional()
  @IsEnum(PaymentIntentDto)
  intent?: PaymentIntentDto; // default SIGNAL
}
