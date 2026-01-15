import { IsBoolean, IsInt, IsNotEmpty, Max, Min } from 'class-validator';

export class BusinessHourItemDto {
  @IsInt()
  @Min(0)
  @Max(6)
  weekday!: number; // 0=domingo ... 6=sábado

  @IsNotEmpty()
  startTime!: string; // "09:00"

  @IsNotEmpty()
  endTime!: string; // "18:00"

  @IsBoolean()
  active!: boolean;
}
