import { IsNotEmpty, IsUUID, Matches } from 'class-validator';

export class GetAvailabilityDto {
  @IsUUID()
  serviceId!: string;

  // YYYY-MM-DD
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;
}
