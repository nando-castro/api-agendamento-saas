import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth-request.type';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PublicLinksService } from './public-links.service';

@Controller('booking-links')
@UseGuards(JwtAuthGuard)
export class PublicLinksController {
  constructor(private readonly links: PublicLinksService) {}

  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Body() body: { serviceId?: string },
  ) {
    return this.links.create(req.user.tenantId, body.serviceId);
  }

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.links.list(req.user.tenantId);
  }

  @Patch(':id/toggle')
  toggle(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.links.toggle(req.user.tenantId, id);
  }
}
