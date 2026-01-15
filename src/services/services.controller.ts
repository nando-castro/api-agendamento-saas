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
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServicesService } from './services.service';

@Controller('services')
@UseGuards(JwtAuthGuard)
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateServiceDto) {
    return this.services.create(req.user.tenantId, dto);
  }

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.services.list(req.user.tenantId);
  }

  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.services.update(req.user.tenantId, id, dto);
  }

  @Patch(':id/toggle')
  toggle(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.services.toggle(req.user.tenantId, id);
  }
}
