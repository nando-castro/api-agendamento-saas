import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ThemeController } from './theme.controller';
import { ThemeService } from './theme.service';

@Module({
  controllers: [ThemeController],
  providers: [ThemeService, PrismaService],
})
export class ThemeModule {}
