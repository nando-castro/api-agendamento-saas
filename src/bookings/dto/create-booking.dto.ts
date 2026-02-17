import { Type } from 'class-transformer';
import {
  IsDefined,
  IsEmail,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class CreateBookingCustomerDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
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
  startAt!: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => CreateBookingCustomerDto)
  customer!: CreateBookingCustomerDto;
}
