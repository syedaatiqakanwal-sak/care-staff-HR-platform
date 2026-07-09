import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffProfile } from '../staff/staff-profile.entity';
import { isManagementRole } from '../users/role.utils';

@Injectable()
export class RecruitmentAccessService {
  constructor(
    @InjectRepository(StaffProfile)
    private readonly staffRepo: Repository<StaffProfile>,
  ) {}

  async assertManagementAccess(
    requestUser: { userId: string; role: string },
    targetUserId: string,
  ): Promise<StaffProfile> {
    if (!isManagementRole(requestUser.role)) {
      throw new NotFoundException('Staff profile not found');
    }
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
