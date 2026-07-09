import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffProfile } from '../staff/staff-profile.entity';
import {
  canEditOtherStaffProfiles,
  canViewOtherStaffProfiles,
  isPayrollRole,
} from '../users/role.utils';
import { isPayrollDocumentType } from '../payroll/payroll.constants';

@Injectable()
export class DocumentsAccessService {
  constructor(
    @InjectRepository(StaffProfile)
    private readonly staffRepo: Repository<StaffProfile>,
  ) {}

  async resolveStaffProfileByUserId(userId: string): Promise<StaffProfile> {
    const profile = await this.staffRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
    if (!profile) {
      throw new NotFoundException('Staff profile not found');
    }
    return profile;
  }

  async resolveStaffProfileByStaffId(staffId: string): Promise<StaffProfile> {
    const profile = await this.staffRepo.findOne({
      where: { id: staffId },
      relations: ['user'],
    });
    if (!profile) {
      throw new NotFoundException('Staff profile not found');
    }
    return profile;
  }

  /**
   * Route param :id is the user id (consistent with GET /staff/:id).
   */
  async assertCanViewStaffDocuments(
    requestUser: { userId: string; role: string },
    targetUserId: string,
  ): Promise<StaffProfile> {
    const profile = await this.resolveStaffProfileByUserId(targetUserId);
    const isSelf = requestUser.userId === targetUserId;
    if (!canViewOtherStaffProfiles(requestUser.role) && !isSelf) {
      throw new ForbiddenException('Access denied');
    }
    return profile;
  }

  async assertCanWriteStaffDocuments(
    requestUser: { userId: string; role: string },
    targetUserId: string,
    documentType?: string,
  ): Promise<StaffProfile> {
    await this.assertCanViewStaffDocuments(requestUser, targetUserId);
    if (documentType && isPayrollDocumentType(documentType)) {
      this.assertPayrollDocumentAccess(requestUser.role);
      return this.resolveStaffProfileByUserId(targetUserId);
    }
    if (!canEditOtherStaffProfiles(requestUser.role)) {
      throw new ForbiddenException('Only management roles can upload or modify documents');
    }
    return this.resolveStaffProfileByUserId(targetUserId);
  }

  assertPayrollDocumentAccess(role: string): void {
    if (!isPayrollRole(role)) {
      throw new ForbiddenException('HMRC / P45 / P60 documents are restricted to Admin and HR');
    }
  }

  /** Hide payroll document types from non-payroll roles in list responses */
  filterDocumentsForRole<T extends { documentType: string }>(
    documents: T[],
    role: string,
  ): T[] {
    if (isPayrollRole(role)) {
      return documents;
    }
    return documents.filter((d) => !isPayrollDocumentType(d.documentType));
  }
}
