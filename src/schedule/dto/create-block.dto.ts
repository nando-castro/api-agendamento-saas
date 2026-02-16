// create-block.dto.ts
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateBlockDto {
  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
