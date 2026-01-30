import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AvailabilityService } from '../availability/availability.service';
import { BookingsService } from '../bookings/bookings.service';
import { CreateBookingDto } from '../bookings/dto/create-booking.dto';
import { PublicService } from './public.service';

@Controller('public')
export class PublicController {
  constructor(
    private readonly pub: PublicService,
    private readonly availability: AvailabilityService,
    private readonly bookings: BookingsService,
  ) {}

  // 1) Listar serviços disponíveis via token
  @Get('links/:token/services')
  services(@Param('token') token: string) {
    return this.pub.listServices(token);
  }

  // 2) Ver disponibilidade via token
  @Get('links/:token/availability')
  async availabilityByToken(
    @Param('token') token: string,
    @Query('serviceId') serviceId: string,
    @Query('date') date: string,
  ) {
    const link = await this.pub.resolveToken(token);

    // se link for restrito a um serviço, ignora serviceId diferente
    const effectiveServiceId = link.serviceId ?? serviceId;

    return this.availability.getDailySlots(
      link.tenantId,
      effectiveServiceId,
      date,
    );
  }

  // 3) Criar booking via token (sem JWT)
  @Post('links/:token/bookings')
  async createBookingByToken(
    @Param('token') token: string,
    @Body() dto: CreateBookingDto,
  ) {
    const link = await this.pub.resolveToken(token);

    // se link for restrito a um serviço, força esse serviço
    const effectiveServiceId = link.serviceId ?? dto.serviceId;

    return this.bookings.create(link.tenantId, {
      ...dto,
      serviceId: effectiveServiceId,
    });
  }

  // ✅ NOVO: buscar booking para polling
  @Get('links/:token/bookings/:bookingId')
  async getBookingByToken(
    @Param('token') token: string,
    @Param('bookingId') bookingId: string,
  ) {
    const link = await this.pub.resolveToken(token);
    return this.bookings.getByIdForPublic(link.tenantId, bookingId);
  }

  // ✅ NOVO: cancelar (rollback) se PIX falhar
  @Post('links/:token/bookings/:bookingId/cancel')
  async cancelBookingByToken(
    @Param('token') token: string,
    @Param('bookingId') bookingId: string,
  ) {
    const link = await this.pub.resolveToken(token);
    return this.bookings.cancelPendingByPublic(link.tenantId, bookingId);
  }
}
