import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffProfile } from '../staff/staff-profile.entity';
import {
  canViewOtherStaffProfiles,
  isManagementRole,
  isStaffRole,
} from '../users/role.utils';

@Injectable()
export class AttendanceAccessService {
  constructor(
    @InjectRepository(StaffProfile)
    private readonly staffRepo: Repository<StaffProfile>,
  ) {}

  async resolveProfileByUserId(userId: string): Promise<StaffProfile> {
    const profile = await this.staffRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
    if (!profile) {
      throw new NotFoundException('Staff profile not found');
    }
    return profile;
  }

  assertCanView(
    requestUser: { userId: string; role: string },
    targetUserId: string,
  ): void {
    const isSelf = requestUser.userId === targetUserId;
    if (!isSelf && !canViewOtherStaffProfiles(requestUser.role)) {
      throw new ForbiddenException('Access denied');
    }
  }

  assertCanRequestLeave(
    requestUser: { userId: string; role: string },
    targetUserId: string,
  ): void {
    const isSelf = requestUser.userId === targetUserId;
    if (isSelf && isStaffRole(requestUser.role)) {
      return;
    }
    if (isManagementRole(requestUser.role)) {
      return;
    }
    throw new ForbiddenException('You may only submit leave requests for your own profile');
  }

  assertCanApproveLeave(requestUser: { userId: string; role: string }): void {
    if (!isManagementRole(requestUser.role)) {
      throw new ForbiddenException('Only HR management can approve or reject leave');
    }
  }

  assertCanManageAttendance(requestUser: { userId: string; role: string }): void {
    if (!isManagementRole(requestUser.role)) {
      throw new ForbiddenException('Only HR management can record attendance');
    }
  }
}
