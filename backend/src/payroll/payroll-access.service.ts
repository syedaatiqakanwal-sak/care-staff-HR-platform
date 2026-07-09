import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffProfile } from '../staff/staff-profile.entity';
import { isPayrollRole } from '../users/role.utils';
import { UserRole } from '../users/user.entity';

/**
 * Payroll data: ADMIN and HR only. Service-level gate in addition to @Roles on controllers.
 */
@Injectable()
export class PayrollAccessService {
  constructor(
    @InjectRepository(StaffProfile)
    private readonly staffRepo: Repository<StaffProfile>,
  ) {}

  assertPayrollRole(role: string): void {
    if (!isPayrollRole(role)) {
      throw new ForbiddenException('Payroll access is restricted to Admin and HR');
    }
    const normalized = role.toUpperCase();
    if (
      normalized === UserRole.MANAGER ||
      normalized === UserRole.SUPERVISOR ||
      normalized === UserRole.STAFF
    ) {
      throw new ForbiddenException('Payroll access is restricted to Admin and HR');
    }
  }

  async resolveStaffByUserId(
    requestUser: { userId: string; role: string },
    targetUserId: string,
  ): Promise<StaffProfile> {
    this.assertPayrollRole(requestUser.role);
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
