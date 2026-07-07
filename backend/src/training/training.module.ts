import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrainingRecord } from './training-record.entity';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';
import { Certificate } from '../certificates/certificate.entity';
import { ApiTokensModule } from '../api-tokens/api-tokens.module';
import { JwtOrApiTokenGuard } from '../staff/jwt-or-api-token.guard';

@Module({
    imports: [TypeOrmModule.forFeature([TrainingRecord, Certificate]), ApiTokensModule],
    controllers: [TrainingController],
    providers: [TrainingService, JwtOrApiTokenGuard],
    exports: [TypeOrmModule, TrainingService],
})
export class TrainingModule { }
