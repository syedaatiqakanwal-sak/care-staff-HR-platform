import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffModule } from '../staff/staff.module';
import { PolicyReadingSession } from './policy-reading-session.entity';
import { PolicyReadingController } from './policies.controller';
import { PoliciesService } from './policies.service';
import { PolicyReportService } from './policy-report.service';
import { Policy } from './policy.entity';
import { PolicyNotification } from './policy-notification.entity';
import { PoliciesCrudService } from './policies-crud.service';
import { PoliciesCrudController } from './policies-crud.controller';
import { PolicyNotificationsService } from './policy-notifications.service';
import { PolicyNotificationsController } from './policy-notifications.controller';
import { PolicySessionsController } from './policy-sessions.controller';
import { PolicyAnalyticsService } from './policy-analytics.service';
import { PolicyAnalyticsController } from './policy-analytics.controller';
import { StaffProfile } from '../staff/staff-profile.entity';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Policy, PolicyReadingSession, PolicyNotification, StaffProfile]),
    StaffModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '60m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    PolicyReadingController,
    PoliciesCrudController,
    PolicyNotificationsController,
    PolicySessionsController,
    PolicyAnalyticsController,
  ],
  providers: [
    PoliciesService,
    PolicyReportService,
    PoliciesCrudService,
    PolicyNotificationsService,
    PolicyAnalyticsService,
  ],
  exports: [PoliciesService],
})
export class PoliciesModule {}

