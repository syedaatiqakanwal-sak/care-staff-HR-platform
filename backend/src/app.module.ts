import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { StaffModule } from './staff/staff.module';
import { CertificatesModule } from './certificates/certificates.module';
import { VleCredentialsModule } from './vle-credentials/vle-credentials.module';
import { TrainingModule } from './training/training.module';
import { InHouseTrainingModule } from './inhouse-training/inhouse-training.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReferencesModule } from './references/references.module';
import { CoursesModule } from './courses/courses.module';
import { PoliciesModule } from './policies/policies.module';
import { ApiTokensModule } from './api-tokens/api-tokens.module';
import { N8nAutomationModule } from './n8n-automation/n8n-automation.module';
import { DocumentsModule } from './documents/documents.module';
import { ReportsModule } from './reports/reports.module';
import { RecruitmentModule } from './recruitment/recruitment.module';
import { AuditModule } from './audit/audit.module';
import { HrNotesModule } from './hr-notes/hr-notes.module';
import { AttendanceModule } from './attendance/attendance.module';
import { PayrollModule } from './payroll/payroll.module';
import { DevAwareThrottlerGuard } from './auth/dev-aware-throttler.guard';
import { ReadOnlyGuard } from './auth/readonly.guard';
import { JwtOrApiTokenGuard } from './staff/jwt-or-api-token.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(__dirname, '../.env'), '.env'],
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    StaffModule,
    CertificatesModule,
    VleCredentialsModule,
    TrainingModule,
    InHouseTrainingModule,
    NotificationsModule,
    ReferencesModule,
    CoursesModule,
    PoliciesModule,
    ApiTokensModule,
    N8nAutomationModule,
    DocumentsModule,
    ReportsModule,
    RecruitmentModule,
    AuditModule,
    HrNotesModule,
    AttendanceModule,
    PayrollModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    JwtOrApiTokenGuard,
    {
      provide: APP_GUARD,
      useClass: JwtOrApiTokenGuard,
    },
    {
      provide: APP_GUARD,
      useClass: DevAwareThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ReadOnlyGuard,
    },
  ],
})
export class AppModule { }
