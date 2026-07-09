import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PayrollInfo } from './payroll-info.entity';
import { PayrollAccessService } from './payroll-access.service';
import { UpdatePayrollDto } from './dto/update-payroll.dto';
import { createFieldCrypto } from '../common/field-crypto.util';
import { DocumentsService } from '../documents/documents.service';
import { PAYROLL_DOCUMENT_TYPES } from './payroll.constants';
import { CreateStaffDocumentDto } from '../documents/dto/documents.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-action.enum';

const ENTITY_TYPE = 'payroll_info';

@Injectable()
export class PayrollService {
  private readonly bankCrypto = createFieldCrypto(
    'PAYROLL_ENCRYPTION_KEY',
    'PAYROLL_ENCRYPTION_SALT',
  );

  constructor(
    @InjectRepository(PayrollInfo)
    private readonly payrollRepo: Repository<PayrollInfo>,
    private readonly access: PayrollAccessService,
    private readonly documentsService: DocumentsService,
    private readonly audit: AuditService,
  ) {}

  private async auditPayroll(
    requestUser: { userId: string; role: string },
    action: AuditAction,
    entityId: string,
    summary: string,
    ipAddress?: string,
  ) {
    await this.audit.log({
      userId: requestUser.userId,
      userRole: requestUser.role,
      action,
      entityType: ENTITY_TYPE,
      entityId,
      summary,
      ipAddress,
    });
  }

  private serialize(info: PayrollInfo) {
    let bankDetailsMasked: string | null = null;
    const hasBankDetails = Boolean(info.bankDetailsEncrypted);
    if (hasBankDetails && info.bankDetailsEncrypted) {
      const plain = this.bankCrypto.decrypt(info.bankDetailsEncrypted);
      bankDetailsMasked = plain ? this.bankCrypto.maskBankDetails(plain) : '****';
    }
    return {
      id: info.id,
      staffId: info.staffId,
      salaryOrRate: info.salaryOrRate,
      payType: info.payType,
      contractType: info.contractType,
      pensionStatus: info.pensionStatus,
      bankDetailsMasked,
      hasBankDetails,
      payrollNotes: info.payrollNotes,
      createdAt: info.createdAt,
      updatedAt: info.updatedAt,
    };
  }

  async getOrCreate(
    requestUser: { userId: string; role: string },
    targetUserId: string,
    ipAddress?: string,
  ) {
    this.access.assertPayrollRole(requestUser.role);
    const profile = await this.access.resolveStaffByUserId(requestUser, targetUserId);
    let info = await this.payrollRepo.findOne({ where: { staffId: profile.id } });
    if (!info) {
      info = this.payrollRepo.create({ staffId: profile.id });
      info = await this.payrollRepo.save(info);
    }
    await this.auditPayroll(
      requestUser,
      AuditAction.VIEW_RESTRICTED,
      info.id,
      `Viewed payroll record for staff user ${targetUserId}`,
      ipAddress,
    );
    return this.serialize(info);
  }

  async upsert(
    requestUser: { userId: string; role: string },
    targetUserId: string,
    dto: UpdatePayrollDto,
    ipAddress?: string,
  ) {
    this.access.assertPayrollRole(requestUser.role);
    const profile = await this.access.resolveStaffByUserId(requestUser, targetUserId);
    let info = await this.payrollRepo.findOne({ where: { staffId: profile.id } });
    if (!info) {
      info = this.payrollRepo.create({ staffId: profile.id });
    }

    if (dto.salaryOrRate !== undefined) info.salaryOrRate = dto.salaryOrRate;
    if (dto.payType !== undefined) info.payType = dto.payType;
    if (dto.contractType !== undefined) info.contractType = dto.contractType;
    if (dto.pensionStatus !== undefined) info.pensionStatus = dto.pensionStatus;
    if (dto.payrollNotes !== undefined) info.payrollNotes = dto.payrollNotes;

    if (dto.bankDetails !== undefined) {
      if (dto.bankDetails === null || dto.bankDetails === '') {
        info.bankDetailsEncrypted = null;
      } else {
        info.bankDetailsEncrypted = this.bankCrypto.encrypt(dto.bankDetails.trim());
      }
    }

    const saved = await this.payrollRepo.save(info);
    const bankUpdated = dto.bankDetails !== undefined && dto.bankDetails !== null && dto.bankDetails !== '';
    await this.auditPayroll(
      requestUser,
      AuditAction.UPDATE,
      saved.id,
      `Updated payroll${bankUpdated ? ' (bank details changed)' : ''} for staff user ${targetUserId}`,
      ipAddress,
    );
    return this.serialize(saved);
  }

  async listPayrollDocuments(
    requestUser: { userId: string; role: string },
    targetUserId: string,
    ipAddress?: string,
  ) {
    this.access.assertPayrollRole(requestUser.role);
    const profile = await this.access.resolveStaffByUserId(requestUser, targetUserId);
    const all = await this.documentsService.listForStaffProfile(profile.id);
    const filtered = all.filter((d) =>
      PAYROLL_DOCUMENT_TYPES.includes(d.documentType as (typeof PAYROLL_DOCUMENT_TYPES)[number]),
    );
    await this.audit.log({
      userId: requestUser.userId,
      userRole: requestUser.role,
      action: AuditAction.VIEW_RESTRICTED,
      entityType: 'staff_document',
      entityId: profile.id,
      summary: `Listed ${filtered.length} payroll document(s) for staff user ${targetUserId}`,
      ipAddress,
    });
    return filtered;
  }

  async uploadPayrollDocument(
    requestUser: { userId: string; role: string },
    targetUserId: string,
    dto: CreateStaffDocumentDto,
    file: { filename: string; originalname: string; size: number; mimetype?: string },
    ipAddress?: string,
  ) {
    this.access.assertPayrollRole(requestUser.role);
    const profile = await this.access.resolveStaffByUserId(requestUser, targetUserId);
    const doc = await this.documentsService.uploadDocument(
      profile.id,
      requestUser.userId,
      dto,
      file,
      requestUser,
      ipAddress,
    );
    return doc;
  }
}
