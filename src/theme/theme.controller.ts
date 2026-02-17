import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth-request.type';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateTenantThemeDto } from './dto/update-tenant-theme.dto';
import { ThemeService } from './theme.service';

@Controller('theme')
@UseGuards(JwtAuthGuard)
export class ThemeController {
  constructor(private readonly theme: ThemeService) {}

  @Get()
  get(@Req() req: AuthenticatedRequest) {
    return this.theme.get(req.user.tenantId);
  }

  @Patch()
  update(@Req() req: AuthenticatedRequest, @Body() dto: UpdateTenantThemeDto) {
    return this.theme.update(req.user.tenantId, dto);
  }

  @Delete()
  reset(@Req() req: AuthenticatedRequest) {
    return this.theme.reset(req.user.tenantId);
  }
}
