import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { LeaveType } from '../leave-type.enum';
import { AttendanceStatus } from '../attendance-status.enum';

export class CreateLeaveRequestDto {
  @IsEnum(LeaveType)
  leaveType: LeaveType;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  reason?: string;
}

export class CreateAttendanceDto {
  @IsDateString()
  date: string;

  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  returnToWorkCompleted?: boolean;
}

export class UpdateAttendanceDto {
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  returnToWorkCompleted?: boolean;
}

export class UpdateAnnualLeaveAllowanceDto {
  @IsInt()
  @Min(0)
  annualLeaveAllowanceDays: number;
}
