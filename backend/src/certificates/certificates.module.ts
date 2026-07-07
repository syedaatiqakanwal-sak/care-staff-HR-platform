import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Certificate } from './certificate.entity';
import { User } from '../users/user.entity';
import { CertificatesService } from './certificates.service';
import { CertificatesController } from './certificates.controller';
import { StaffProfile } from '../staff/staff-profile.entity';
import { TrainingModule } from '../training/training.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
    imports: [
        TypeOrmModule.forFeature([Certificate, User, StaffProfile]),
        TrainingModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '60s' },
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [CertificatesController],
    providers: [CertificatesService],
    exports: [CertificatesService],
})
export class CertificatesModule { }
