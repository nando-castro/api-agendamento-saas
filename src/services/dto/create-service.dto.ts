import { IsBoolean, IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';

export class CreateServiceDto {
  @IsNotEmpty()
  name!: string;

  @IsInt()
  @Min(1)
  durationMinutes!: number;

  @IsInt()
  @Min(0)
  priceCents!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  signalPercentOverride?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
