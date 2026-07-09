import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffProfile } from '../staff/staff-profile.entity';
import { isManagementRole } from '../users/role.utils';
import { UserRole } from '../users/user.entity';

/**
 * HR case notes are restricted to ADMIN, MANAGER, and HR only.
 * STAFF and SUPERVISOR must never access these records (controller + service gate).
 */
@Injectable()
export class HrNotesAccessService {
  constructor(
    @InjectRepository(StaffProfile)
    private readonly staffRepo: Repository<StaffProfile>,
  ) {}

  assertHrNotesRole(role: string): void {
    if (!isManagementRole(role)) {
      throw new ForbiddenException('HR case notes are restricted to HR management roles');
    }
    const normalized = role.toUpperCase();
    if (normalized === UserRole.SUPERVISOR || normalized === UserRole.STAFF) {
      throw new ForbiddenException('HR case notes are restricted to HR management roles');
    }
  }

  async resolveStaffProfileForHrNotes(
    requestUser: { userId: string; role: string },
    targetUserId: string,
  ): Promise<StaffProfile> {
    this.assertHrNotesRole(requestUser.role);

    const profile = await this.staffRepo.findOne({
      where: { user: { id: targetUserId } },
      relations: ['user'],
    });
    if (!profile) {
      throw new NotFoundException('Staff profile not found');
    }
    return profile;
  }
}
