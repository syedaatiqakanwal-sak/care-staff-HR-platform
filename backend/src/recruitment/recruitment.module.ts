import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecruitmentRecord } from './recruitment-record.entity';
import { StaffProfile } from '../staff/staff-profile.entity';
import { RecruitmentService } from './recruitment.service';
import { RecruitmentAccessService } from './recruitment-access.service';
import { RecruitmentController } from './recruitment.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RecruitmentRecord, StaffProfile])],
  controllers: [RecruitmentController],
  providers: [RecruitmentService, RecruitmentAccessService],
  exports: [RecruitmentService],
})
export class RecruitmentModule {}
