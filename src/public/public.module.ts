import { Module } from '@nestjs/common';
import { AvailabilityModule } from '../availability/availability.module';
import { BookingsModule } from '../bookings/bookings.module';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

@Module({
  imports: [AvailabilityModule, BookingsModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
