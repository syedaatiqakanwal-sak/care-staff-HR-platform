import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaveRecord } from './leave-record.entity';
import { AttendanceRecord } from './attendance-record.entity';
import { StaffProfile } from '../staff/staff-profile.entity';
import { AttendanceAccessService } from './attendance-access.service';
import {
  CreateAttendanceDto,
  CreateLeaveRequestDto,
  UpdateAttendanceDto,
} from './dto/attendance.dto';
import { LeaveType } from './leave-type.enum';
import { LeaveStatus } from './leave-status.enum';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-action.enum';

/**
 * Annual leave balance policy (documented):
 * -----------------------------------------
 * - Entitlement is stored on staff_profiles.annualLeaveAllowanceDays (HR-configurable, default 28).
 * - Used days are computed from leave_records: sum of inclusive calendar days for
 *   leaveType = ANNUAL, status = APPROVED, where startDate falls in the current calendar year.
 * - remainingDays = allowanceDays - usedDays (minimum 0 for display).
 * We store allowance on the profile rather than deriving it from tenure alone so HR can set
 * contractual entitlement per employee.
 */
@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(LeaveRecord)
    private readonly leaveRepo: Repository<LeaveRecord>,
    @InjectRepository(AttendanceRecord)
    private readonly attendanceRepo: Repository<AttendanceRecord>,
    @InjectRepository(StaffProfile)
    private readonly staffRepo: Repository<StaffProfile>,
    private readonly access: AttendanceAccessService,
    private readonly audit: AuditService,
  ) {}

  daysInclusive(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
    return Math.max(0, diff);
  }

  async getLeaveBalance(staffProfileId: string) {
    const profile = await this.staffRepo.findOne({ where: { id: staffProfileId } });
    if (!profile) {
      throw new NotFoundException('Staff profile not found');
    }

    const allowanceDays = profile.annualLeaveAllowanceDays ?? 28;
    const year = new Date().getFullYear();

    const [row] = await this.leaveRepo.query(
      `
      SELECT COALESCE(SUM(("endDate" - "startDate") + 1), 0)::int AS used_days
      FROM leave_records
      WHERE "staffId" = $1
        AND "leaveType" = 'ANNUAL'
        AND status = 'APPROVED'
        AND EXTRACT(YEAR FROM "startDate") = $2
      `,
      [staffProfileId, year],
    );

    const usedDays = Number(row?.used_days ?? 0);
    const remainingDays = Math.max(0, allowanceDays - usedDays);

    return {
      allowanceDays,
      usedDays,
      remainingDays,
      year,
    };
  }

  private serializeLeave(record: LeaveRecord) {
    return {
      id: record.id,
      staffId: record.staffId,
      leaveType: record.leaveType,
      startDate: record.startDate,
      endDate: record.endDate,
      status: record.status,
      reason: record.reason,
      approvedBy: record.approvedBy,
      days: this.daysInclusive(record.startDate, record.endDate),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      staffName: record.staff
        ? `${record.staff.firstName || ''} ${record.staff.lastName || ''}`.trim()
        : undefined,
      approverEmail: (record as LeaveRecord & { approver?: { email?: string } }).approver?.email,
    };
  }

  private serializeAttendance(record: AttendanceRecord) {
    return {
      id: record.id,
      staffId: record.staffId,
      date: record.date,
      status: record.status,
      notes: record.notes,
      returnToWorkCompleted: record.returnToWorkCompleted,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async getLeaveBalanceForUser(
    requestUser: { userId: string; role: string },
    targetUserId: string,
  ) {
    this.access.assertCanView(requestUser, targetUserId);
    const profile = await this.access.resolveProfileByUserId(targetUserId);
    return this.getLeaveBalance(profile.id);
  }

  async listLeave(
    requestUser: { userId: string; role: string },
    targetUserId: string,
  ) {
    this.access.assertCanView(requestUser, targetUserId);
    const profile = await this.access.resolveProfileByUserId(targetUserId);
    const records = await this.leaveRepo.find({
      where: { staffId: profile.id },
      order: { startDate: 'DESC' },
      relations: ['approver'],
    });
    return records.map((r) => this.serializeLeave(r));
  }

  async createLeaveRequest(
    requestUser: { userId: string; role: string },
    targetUserId: string,
    dto: CreateLeaveRequestDto,
  ) {
    this.access.assertCanRequestLeave(requestUser, targetUserId);
    const profile = await this.access.resolveProfileByUserId(targetUserId);

    if (dto.endDate < dto.startDate) {
      throw new BadRequestException('End date must be on or after start date');
    }

    const requestedDays = this.daysInclusive(dto.startDate, dto.endDate);
    if (dto.leaveType === LeaveType.ANNUAL) {
      const balance = await this.getLeaveBalance(profile.id);
      if (requestedDays > balance.remainingDays) {
        throw new BadRequestException(
          `Insufficient annual leave balance (${balance.remainingDays} days remaining)`,
        );
      }
    }

    const record = this.leaveRepo.create({
      staffId: profile.id,
      leaveType: dto.leaveType,
      startDate: dto.startDate,
      endDate: dto.endDate,
      reason: dto.reason?.trim() || null,
      status: LeaveStatus.REQUESTED,
    });
    const saved = await this.leaveRepo.save(record);
    return this.serializeLeave(saved);
  }

  async listPendingLeave(requestUser: { userId: string; role: string }) {
    this.access.assertCanApproveLeave(requestUser);
    const records = await this.leaveRepo.find({
      where: { status: LeaveStatus.REQUESTED },
      relations: ['staff', 'staff.user', 'approver'],
      order: { createdAt: 'ASC' },
    });
    return records.map((r) => ({
      ...this.serializeLeave(r),
      staffUserId: r.staff?.user?.id,
    }));
  }

  async approveLeave(
    requestUser: { userId: string; role: string },
    leaveId: string,
    ipAddress?: string,
  ) {
    this.access.assertCanApproveLeave(requestUser);
    const record = await this.leaveRepo.findOne({
      where: { id: leaveId },
      relations: ['staff'],
    });
    if (!record) {
      throw new NotFoundException('Leave request not found');
    }
    if (record.status !== LeaveStatus.REQUESTED) {
      throw new BadRequestException('Leave request is not pending approval');
    }

    if (record.leaveType === LeaveType.ANNUAL) {
      const balance = await this.getLeaveBalance(record.staffId);
      const days = this.daysInclusive(record.startDate, record.endDate);
      if (days > balance.remainingDays) {
        throw new BadRequestException(
          `Cannot approve: only ${balance.remainingDays} annual leave days remaining`,
        );
      }
    }

    record.status = LeaveStatus.APPROVED;
    record.approvedBy = requestUser.userId;
    const saved = await this.leaveRepo.save(record);
    await this.audit.log({
      userId: requestUser.userId,
      userRole: requestUser.role,
      action: AuditAction.UPDATE,
      entityType: 'leave_record',
      entityId: saved.id,
      summary: `Approved leave ${saved.leaveType} ${saved.startDate}–${saved.endDate}`,
      ipAddress,
    });
    return this.serializeLeave(saved);
  }

  async rejectLeave(
    requestUser: { userId: string; role: string },
    leaveId: string,
    ipAddress?: string,
  ) {
    this.access.assertCanApproveLeave(requestUser);
    const record = await this.leaveRepo.findOne({ where: { id: leaveId } });
    if (!record) {
      throw new NotFoundException('Leave request not found');
    }
    if (record.status !== LeaveStatus.REQUESTED) {
      throw new BadRequestException('Leave request is not pending approval');
    }
    record.status = LeaveStatus.REJECTED;
    record.approvedBy = requestUser.userId;
    const saved = await this.leaveRepo.save(record);
    await this.audit.log({
      userId: requestUser.userId,
      userRole: requestUser.role,
      action: AuditAction.UPDATE,
      entityType: 'leave_record',
      entityId: saved.id,
      summary: `Rejected leave ${saved.leaveType} ${saved.startDate}–${saved.endDate}`,
      ipAddress,
    });
    return this.serializeLeave(saved);
  }

  async listAttendance(
    requestUser: { userId: string; role: string },
    targetUserId: string,
  ) {
    this.access.assertCanView(requestUser, targetUserId);
    const profile = await this.access.resolveProfileByUserId(targetUserId);
    const records = await this.attendanceRepo.find({
      where: { staffId: profile.id },
      order: { date: 'DESC' },
      take: 90,
    });
    return records.map((r) => this.serializeAttendance(r));
  }

  async upsertAttendance(
    requestUser: { userId: string; role: string },
    targetUserId: string,
    dto: CreateAttendanceDto,
  ) {
    this.access.assertCanManageAttendance(requestUser);
    const profile = await this.access.resolveProfileByUserId(targetUserId);

    let record = await this.attendanceRepo.findOne({
      where: { staffId: profile.id, date: dto.date },
    });
    if (record) {
      record.status = dto.status;
      record.notes = dto.notes?.trim() ?? record.notes;
      record.returnToWorkCompleted = dto.returnToWorkCompleted ?? record.returnToWorkCompleted;
    } else {
      record = this.attendanceRepo.create({
        staffId: profile.id,
        date: dto.date,
        status: dto.status,
        notes: dto.notes?.trim() || null,
        returnToWorkCompleted: dto.returnToWorkCompleted ?? false,
      });
    }
    const saved = await this.attendanceRepo.save(record);
    return this.serializeAttendance(saved);
  }

  async updateAttendance(
    requestUser: { userId: string; role: string },
    targetUserId: string,
    recordId: string,
    dto: UpdateAttendanceDto,
  ) {
    this.access.assertCanManageAttendance(requestUser);
    const profile = await this.access.resolveProfileByUserId(targetUserId);
    const record = await this.attendanceRepo.findOne({
      where: { id: recordId, staffId: profile.id },
    });
    if (!record) {
      throw new NotFoundException('Attendance record not found');
    }
    if (dto.status !== undefined) record.status = dto.status;
    if (dto.notes !== undefined) record.notes = dto.notes?.trim() || null;
    if (dto.returnToWorkCompleted !== undefined) {
      record.returnToWorkCompleted = dto.returnToWorkCompleted;
    }
    const saved = await this.attendanceRepo.save(record);
    return this.serializeAttendance(saved);
  }

  async updateAnnualLeaveAllowance(
    requestUser: { userId: string; role: string },
    targetUserId: string,
    days: number,
  ) {
    this.access.assertCanManageAttendance(requestUser);
    const profile = await this.access.resolveProfileByUserId(targetUserId);
    profile.annualLeaveAllowanceDays = days;
    await this.staffRepo.save(profile);
    return this.getLeaveBalance(profile.id);
  }
}
