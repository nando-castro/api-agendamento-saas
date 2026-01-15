import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class CreateBlockDto {
  @IsISO8601()
  startAt!: string;

  @IsISO8601()
  endAt!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
