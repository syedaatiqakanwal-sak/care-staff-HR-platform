import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { LeaveRecord } from './leave-record.entity';
import { AttendanceRecord } from './attendance-record.entity';
import { StaffProfile } from '../staff/staff-profile.entity';
import { AttendanceAccessService } from './attendance-access.service';
import {
  CreateAttendanceDto,
  CreateLeaveRequestDto,
  UpdateAttendanceDto,
} from './dto/attendance.dto';
import { LeaveStatus } from './leave-status.enum';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-action.enum';

/**
 * Annual leave balance policy (documented):
 * -----------------------------------------
 * - Entitlement is stored on staff_profiles.annualLeaveAllowanceDays (HR-configurable, default 28).
 * - Used days are every approved leave request whose start date is in the current calendar year.
 * - Sick, unpaid, and emergency leave count the same as annual leave once approved.
 * - remainingDays = allowanceDays - usedDays (minimum 0).
 * - availableToBook = remainingDays minus leave that is still requested.
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

  private async getLeaveBalanceWithManager(
    staffProfileId: string,
    manager?: EntityManager,
  ) {
    const staffRepo = manager ? manager.getRepository(StaffProfile) : this.staffRepo;
    const profile = await staffRepo.findOne({ where: { id: staffProfileId } });
    if (!profile) {
      throw new NotFoundException('Staff profile not found');
    }

    const allowanceDays = profile.annualLeaveAllowanceDays ?? 28;
    const year = new Date().getFullYear();
    const runQuery = (sql: string, params?: unknown[]) =>
      manager ? manager.query(sql, params) : this.leaveRepo.query(sql, params);

    const [row] = (await runQuery(
      `
      SELECT
        COALESCE(SUM(CASE WHEN status = 'APPROVED'
          THEN ("endDate" - "startDate") + 1 ELSE 0 END), 0)::int AS used_days,
        COALESCE(SUM(CASE WHEN status = 'REQUESTED'
          THEN ("endDate" - "startDate") + 1 ELSE 0 END), 0)::int AS pending_days
      FROM leave_records
      WHERE "staffId" = $1
        AND EXTRACT(YEAR FROM "startDate") = $2
      `,
      [staffProfileId, year],
    )) as Array<{ used_days: number; pending_days: number }>;

    const usedDays = Number(row?.used_days ?? 0);
    const pendingDays = Number(row?.pending_days ?? 0);
    const remainingDays = Math.max(0, allowanceDays - usedDays);
    const availableToBook = Math.max(0, remainingDays - pendingDays);

    return {
      allowanceDays,
      usedDays,
      pendingDays,
      remainingDays,
      availableToBook,
      year,
    };
  }

  async getLeaveBalance(staffProfileId: string) {
    return this.getLeaveBalanceWithManager(staffProfileId);
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

    const saved = await this.leaveRepo.manager.transaction(async (tx) => {
      // Serialize leave creates/approves for this staff to prevent over-booking
      await tx.getRepository(StaffProfile)
        .createQueryBuilder('sp')
        .setLock('pessimistic_write')
        .where('sp.id = :id', { id: profile.id })
        .getOne();

      const balance = await this.getLeaveBalanceWithManager(profile.id, tx);
      const bookable = Math.max(0, balance.remainingDays - balance.pendingDays);
      if (requestedDays > bookable) {
        throw new BadRequestException(
          `Insufficient leave balance (${bookable} days remaining after pending requests)`,
        );
      }

      const leaveRepo = tx.getRepository(LeaveRecord);
      const record = leaveRepo.create({
        staffId: profile.id,
        leaveType: dto.leaveType,
        startDate: dto.startDate,
        endDate: dto.endDate,
        reason: dto.reason?.trim() || null,
        status: LeaveStatus.REQUESTED,
      });
      return leaveRepo.save(record);
    });

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

    const saved = await this.leaveRepo.manager.transaction(async (tx) => {
      const leaveRepo = tx.getRepository(LeaveRecord);
      const record = await leaveRepo
        .createQueryBuilder('leave')
        .setLock('pessimistic_write')
        .where('leave.id = :id', { id: leaveId })
        .getOne();
      if (!record) {
        throw new NotFoundException('Leave request not found');
      }
      if (record.status !== LeaveStatus.REQUESTED) {
        throw new BadRequestException('Leave request is not pending approval');
      }

      // Serialize balance checks per staff member to prevent over-allocation
      await tx.getRepository(StaffProfile)
        .createQueryBuilder('sp')
        .setLock('pessimistic_write')
        .where('sp.id = :id', { id: record.staffId })
        .getOne();

      const balance = await this.getLeaveBalanceWithManager(record.staffId, tx);
      const days = this.daysInclusive(record.startDate, record.endDate);
      if (days > balance.remainingDays) {
        throw new BadRequestException(
          `Cannot approve: only ${balance.remainingDays} leave days remaining`,
        );
      }

      const result = await leaveRepo
        .createQueryBuilder()
        .update(LeaveRecord)
        .set({ status: LeaveStatus.APPROVED, approvedBy: requestUser.userId })
        .where('id = :id AND status = :status', {
          id: leaveId,
          status: LeaveStatus.REQUESTED,
        })
        .execute();
      if (!result.affected) {
        throw new BadRequestException('Leave request is not pending approval');
      }

      return leaveRepo.findOne({ where: { id: leaveId }, relations: ['staff'] });
    });

    if (!saved) {
      throw new NotFoundException('Leave request not found');
    }

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

    const saved = await this.leaveRepo.manager.transaction(async (tx) => {
      const leaveRepo = tx.getRepository(LeaveRecord);
      const result = await leaveRepo
        .createQueryBuilder()
        .update(LeaveRecord)
        .set({ status: LeaveStatus.REJECTED, approvedBy: requestUser.userId })
        .where('id = :id AND status = :status', {
          id: leaveId,
          status: LeaveStatus.REQUESTED,
        })
        .execute();
      if (!result.affected) {
        const existing = await leaveRepo.findOne({ where: { id: leaveId } });
        if (!existing) {
          throw new NotFoundException('Leave request not found');
        }
        throw new BadRequestException('Leave request is not pending approval');
      }
      return leaveRepo.findOne({ where: { id: leaveId } });
    });

    if (!saved) {
      throw new NotFoundException('Leave request not found');
    }

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

    const notes = dto.notes?.trim() || null;
    const returnToWorkCompleted = dto.returnToWorkCompleted ?? false;

    // Atomic upsert against UNIQUE(staffId, date) — safe under concurrent writes
    await this.attendanceRepo.query(
      `
      INSERT INTO attendance_records ("staffId", date, status, notes, "returnToWorkCompleted")
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT ("staffId", date) DO UPDATE SET
        status = EXCLUDED.status,
        notes = COALESCE(EXCLUDED.notes, attendance_records.notes),
        "returnToWorkCompleted" = EXCLUDED."returnToWorkCompleted",
        "updatedAt" = NOW()
      `,
      [profile.id, dto.date, dto.status, notes, returnToWorkCompleted],
    );

    const saved = await this.attendanceRepo.findOne({
      where: { staffId: profile.id, date: dto.date },
    });
    if (!saved) {
      throw new NotFoundException('Attendance record not found after upsert');
    }
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
