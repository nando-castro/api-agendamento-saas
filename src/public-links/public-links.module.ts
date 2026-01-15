import { Module } from '@nestjs/common';
import { PublicLinksController } from './public-links.controller';
import { PublicLinksService } from './public-links.service';

@Module({
  controllers: [PublicLinksController],
  providers: [PublicLinksService],
})
export class PublicLinksModule {}
