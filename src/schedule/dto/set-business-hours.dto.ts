import { Type } from 'class-transformer';
import { ArrayMinSize, ValidateNested } from 'class-validator';
import { BusinessHourItemDto } from './business-hour-item.dto';

export class SetBusinessHoursDto {
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BusinessHourItemDto)
  items!: BusinessHourItemDto[];
}
