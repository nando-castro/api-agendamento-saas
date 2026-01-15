import {
  IsEmail,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class CreateBookingCustomerDto {
  @IsNotEmpty()
  name!: string;

  @IsNotEmpty()
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

export class CreateBookingDto {
  @IsUUID()
  serviceId!: string;

  @IsISO8601()
  startAt!: string; // ISO com offset, ex: 2026-01-20T10:00:00.000-03:00

  customer!: CreateBookingCustomerDto;
}
