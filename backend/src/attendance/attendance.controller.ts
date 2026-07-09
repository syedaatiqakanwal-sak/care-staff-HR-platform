import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { DASHBOARD_ROLES, MANAGEMENT_ROLES } from '../users/role.utils';
import { UserRole } from '../users/user.entity';
import { clientIpFromRequest } from '../audit/audit-request.util';
import type { Request as ExpressRequest } from 'express';
import { AttendanceService } from './attendance.service';
import {
  CreateAttendanceDto,
  CreateLeaveRequestDto,
  UpdateAnnualLeaveAllowanceDto,
  UpdateAttendanceDto,
} from './dto/attendance.dto';

@Controller('staff')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class StaffAttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get(':id/leave/balance')
  @Roles(...DASHBOARD_ROLES, UserRole.STAFF)
  getBalance(@Param('id') userId: string, @Request() req) {
    return this.attendanceService.getLeaveBalanceForUser(req.user, userId);
  }

  @Get(':id/leave')
  @Roles(...DASHBOARD_ROLES, UserRole.STAFF)
  listLeave(@Param('id') userId: string, @Request() req) {
    return this.attendanceService.listLeave(req.user, userId);
  }

  @Post(':id/leave')
  @Roles(...MANAGEMENT_ROLES, UserRole.STAFF)
  createLeave(
    @Param('id') userId: string,
    @Body() dto: CreateLeaveRequestDto,
    @Request() req,
  ) {
    return this.attendanceService.createLeaveRequest(req.user, userId, dto);
  }

  @Get(':id/attendance')
  @Roles(...DASHBOARD_ROLES, UserRole.STAFF)
  listAttendance(@Param('id') userId: string, @Request() req) {
    return this.attendanceService.listAttendance(req.user, userId);
  }

  @Post(':id/attendance')
  @Roles(...MANAGEMENT_ROLES)
  createAttendance(
    @Param('id') userId: string,
    @Body() dto: CreateAttendanceDto,
    @Request() req,
  ) {
    return this.attendanceService.upsertAttendance(req.user, userId, dto);
  }

  @Patch(':id/attendance/:recordId')
  @Roles(...MANAGEMENT_ROLES)
  updateAttendance(
    @Param('id') userId: string,
    @Param('recordId') recordId: string,
    @Body() dto: UpdateAttendanceDto,
    @Request() req,
  ) {
    return this.attendanceService.updateAttendance(req.user, userId, recordId, dto);
  }

  @Put(':id/leave/allowance')
  @Roles(...MANAGEMENT_ROLES)
  updateAllowance(
    @Param('id') userId: string,
    @Body() dto: UpdateAnnualLeaveAllowanceDto,
    @Request() req,
  ) {
    return this.attendanceService.updateAnnualLeaveAllowance(
      req.user,
      userId,
      dto.annualLeaveAllowanceDays,
    );
  }
}

@Controller('attendance')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class LeaveApprovalController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('leave/pending')
  @Roles(...MANAGEMENT_ROLES)
  listPending(@Request() req) {
    return this.attendanceService.listPendingLeave(req.user);
  }

  @Post('leave/:leaveId/approve')
  @Roles(...MANAGEMENT_ROLES)
  approve(
    @Param('leaveId') leaveId: string,
    @Request() req: ExpressRequest & { user: { userId: string; role: string } },
  ) {
    return this.attendanceService.approveLeave(req.user, leaveId, clientIpFromRequest(req));
  }

  @Post('leave/:leaveId/reject')
  @Roles(...MANAGEMENT_ROLES)
  reject(
    @Param('leaveId') leaveId: string,
    @Request() req: ExpressRequest & { user: { userId: string; role: string } },
  ) {
    return this.attendanceService.rejectLeave(req.user, leaveId, clientIpFromRequest(req));
  }
}
