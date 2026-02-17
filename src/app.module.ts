import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AvailabilityModule } from './availability/availability.module';
import { BookingsModule } from './bookings/bookings.module';
import { DevModule } from './dev/dev.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { PublicLinksModule } from './public-links/public-links.module';
import { PublicModule } from './public/public.module';
import { ScheduleModule } from './schedule/schedule.module';
import { ServicesModule } from './services/services.module';
import { TenantsModule } from './tenants/tenants.module';
import { ThemeModule } from './theme/theme.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    TenantsModule,
    ServicesModule,
    ScheduleModule,
    AvailabilityModule,
    BookingsModule,
    PublicLinksModule,
    PublicModule,
    PaymentsModule,
    WebhooksModule,
    DevModule,
    ThemeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
