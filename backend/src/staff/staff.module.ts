import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StaffService } from './staff.service';
import { StaffController } from './staff.controller';
import { DashboardController } from './dashboard.controller';
import { StaffProfile } from './staff-profile.entity';
import { AddressHistory } from './address-history.entity';
import { ReviewForm } from './review-form.entity';
import { TrainingRecord } from '../training/training-record.entity';
import { TrainingModule } from '../training/training.module';
import { Course } from '../courses/course.entity';
import { UsersModule } from '../users/users.module';
import { ApiTokensModule } from '../api-tokens/api-tokens.module';
import { JwtOrApiTokenGuard } from './jwt-or-api-token.guard';
import { VleCredentialsModule } from '../vle-credentials/vle-credentials.module';
import { VleCredentialsController } from '../vle-credentials/vle-credentials.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([StaffProfile, AddressHistory, ReviewForm, TrainingRecord, Course]),
        TrainingModule,
        UsersModule,
        ApiTokensModule,
        VleCredentialsModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
            }),
        }),
    ],
    controllers: [StaffController, DashboardController, VleCredentialsController],
    providers: [StaffService, JwtOrApiTokenGuard],
    exports: [StaffService],
})
export class StaffModule { }
