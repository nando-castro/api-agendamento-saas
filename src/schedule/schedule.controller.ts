import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DateTime } from 'luxon';
import type { AuthenticatedRequest } from '../auth/auth-request.type';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateBlockDto } from './dto/create-block.dto';
import { SetBusinessHoursDto } from './dto/set-business-hours.dto';
import { ScheduleService } from './schedule.service';

@Controller('schedule')
@UseGuards(JwtAuthGuard)
export class ScheduleController {
  constructor(private readonly schedule: ScheduleService) {}

  @Get('business-hours')
  getBusinessHours(@Req() req: AuthenticatedRequest) {
    return this.schedule.getBusinessHours(req.user.tenantId);
  }

  @Put('business-hours')
  setBusinessHours(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SetBusinessHoursDto,
  ) {
    return this.schedule.setBusinessHours(req.user.tenantId, dto.items);
  }

  @Post('blocks')
  async createBlock(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateBlockDto,
  ) {
    const startAt = DateTime.fromISO(dto.startAt).toJSDate();
    const endAt = DateTime.fromISO(dto.endAt).toJSDate();
    return this.schedule.createBlock(
      req.user.tenantId,
      startAt,
      endAt,
      dto.reason,
    );
  }

  @Get('blocks')
  listBlocks(
    @Req() req: AuthenticatedRequest,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const fromDt = DateTime.fromISO(from).toJSDate();
    const toDt = DateTime.fromISO(to).toJSDate();
    return this.schedule.listBlocks(req.user.tenantId, fromDt, toDt);
  }

  @Delete('blocks/:id')
  deleteBlock(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.schedule.deleteBlock(req.user.tenantId, id);
  }
}
