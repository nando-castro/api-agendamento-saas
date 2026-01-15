import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  tenantName!: string;

  @IsNotEmpty()
  tenantSlug!: string;

  @IsNotEmpty()
  adminName!: string;

  @IsEmail()
  adminEmail!: string;

  @MinLength(6)
  adminPassword!: string;
}
