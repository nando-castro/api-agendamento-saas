import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth-request.type';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AvailabilityService } from './availability.service';
import { GetAvailabilityDto } from './dto/get-availability.dto';

@Controller('availability')
@UseGuards(JwtAuthGuard)
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get()
  get(@Req() req: AuthenticatedRequest, @Query() q: GetAvailabilityDto) {
    return this.availability.getDailySlots(
      req.user.tenantId,
      q.serviceId,
      q.date,
    );
  }
}
