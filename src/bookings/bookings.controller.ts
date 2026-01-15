import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth-request.type';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ListBookingsDto } from './dto/list-bookings.dto';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateBookingDto) {
    return this.bookings.create(req.user.tenantId, dto);
  }

  @Get()
  list(@Req() req: AuthenticatedRequest, @Query() q: ListBookingsDto) {
    return this.bookings.list(req.user.tenantId, q.from, q.to);
  }
}
