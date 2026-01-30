// src/dev/dev.module.ts
import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DevController } from './dev.controller';
import { DevService } from './dev.service';
import { DevOnlyGuard } from './guards/dev-only.guard';

@Module({
  controllers: [DevController],
  providers: [DevService, PrismaService, DevOnlyGuard],
})
export class DevModule {}
