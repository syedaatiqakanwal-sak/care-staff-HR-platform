import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaveRecord } from './leave-record.entity';
import { AttendanceRecord } from './attendance-record.entity';
import { StaffProfile } from '../staff/staff-profile.entity';
import { AttendanceService } from './attendance.service';
import { AttendanceAccessService } from './attendance-access.service';
import {
  StaffAttendanceController,
  LeaveApprovalController,
} from './attendance.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LeaveRecord, AttendanceRecord, StaffProfile])],
  controllers: [StaffAttendanceController, LeaveApprovalController],
  providers: [AttendanceService, AttendanceAccessService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
