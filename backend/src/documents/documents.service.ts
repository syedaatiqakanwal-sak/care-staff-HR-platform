import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { canViewOtherStaffProfiles, isPayrollRole } from '../users/role.utils';
import { isPayrollDocumentType } from '../payroll/payroll.constants';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-action.enum';
import * as fs from 'fs';
import * as path from 'path';
import { StaffDocument, StaffDocumentType } from './staff-document.entity';
import { DbsRecord } from './dbs-record.entity';
import { CreateStaffDocumentDto, CreateDbsRecordDto, UpdateDbsRecordDto } from './dto/documents.dto';
import {
  computeDocumentExpiryStatus,
  computeDbsRenewalStatus,
  parseExpiryWarnDayTiers,
  daysUntil,
  DocumentExpiryStatus,
} from './document-expiry.util';
import { NotificationsService } from '../notifications/notifications.service';
import { Reminder } from '../reminders/reminder.entity';
import { StaffProfile } from '../staff/staff-profile.entity';
import { User, UserRole } from '../users/user.entity';

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.doc',
  '.docx',
]);

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export type DocumentWithExpiry = StaffDocument & {
  expiryStatus: DocumentExpiryStatus;
  daysUntilExpiry: number | null;
};

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private readonly uploadsDir = path.join(process.cwd(), 'uploads', 'documents');
  private readonly warnTiers = parseExpiryWarnDayTiers(process.env.DOCUMENT_EXPIRY_WARN_DAYS);
  private readonly notifyCooldownDays = parseInt(
    process.env.DOCUMENT_EXPIRY_NOTIFY_COOLDOWN_DAYS || '7',
    10,
  );
  private readonly dbsDeclarationWarnDays = parseInt(
    process.env.DBS_DECLARATION_WARN_DAYS || '30',
    10,
  );

  constructor(
    @InjectRepository(StaffDocument)
    private readonly documentsRepo: Repository<StaffDocument>,
    @InjectRepository(DbsRecord)
    private readonly dbsRepo: Repository<DbsRecord>,
    @InjectRepository(StaffProfile)
    private readonly staffRepo: Repository<StaffProfile>,
    @InjectRepository(Reminder)
    private readonly remindersRepo: Repository<Reminder>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly notificationsService: NotificationsService,
    private readonly audit: AuditService,
  ) {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  private enrichDocument(doc: StaffDocument): DocumentWithExpiry {
    return {
      ...doc,
      expiryStatus: computeDocumentExpiryStatus(doc.expiryDate, this.warnTiers),
      daysUntilExpiry: daysUntil(doc.expiryDate),
    };
  }

  async listForStaffProfile(staffProfileId: string): Promise<DocumentWithExpiry[]> {
    const docs = await this.documentsRepo.find({
      where: { staffId: staffProfileId },
      order: { createdAt: 'DESC' },
    });
    return docs.map((d) => this.enrichDocument(d));
  }

  async uploadDocument(
    staffProfileId: string,
    uploadedByUserId: string,
    dto: CreateStaffDocumentDto,
    file: { filename: string; originalname: string; size: number; mimetype?: string },
    requestUser?: { userId: string; role: string },
    ipAddress?: string,
  ): Promise<DocumentWithExpiry> {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestException(
        `File type not allowed. Allowed: ${[...ALLOWED_EXTENSIONS].join(', ')}`,
      );
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new BadRequestException('File must not exceed 10MB');
    }

    const relPath = path.join('uploads', 'documents', file.filename);
    const doc = this.documentsRepo.create({
      staffId: staffProfileId,
      documentType: dto.documentType,
      fileName: file.originalname,
      filePath: relPath,
      issueDate: dto.issueDate || null,
      expiryDate: dto.expiryDate || null,
      notes: dto.notes || null,
      uploadedBy: uploadedByUserId,
    });
    const saved = await this.documentsRepo.save(doc);
    if (requestUser) {
      const restricted = isPayrollDocumentType(saved.documentType);
      await this.audit.log({
        userId: requestUser.userId,
        userRole: requestUser.role,
        action: AuditAction.CREATE,
        entityType: 'staff_document',
        entityId: saved.id,
        summary: `Uploaded document ${saved.documentType}: ${saved.fileName}${restricted ? ' (payroll-restricted)' : ''}`,
        ipAddress,
      });
    }
    return this.enrichDocument(saved);
  }

  async deleteDocument(
    documentId: string,
    requestUser?: { userId: string; role: string },
  ): Promise<void> {
    const doc = await this.documentsRepo.findOne({ where: { id: documentId } });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }
    if (
      requestUser &&
      isPayrollDocumentType(doc.documentType) &&
      !isPayrollRole(requestUser.role)
    ) {
      throw new ForbiddenException('Payroll documents are restricted to Admin and HR');
    }
    const abs = path.join(process.cwd(), doc.filePath);
    if (fs.existsSync(abs)) {
      try {
        fs.unlinkSync(abs);
      } catch (e) {
        this.logger.warn(`Failed to delete file ${abs}: ${e}`);
      }
    }
    await this.documentsRepo.delete({ id: documentId });
    if (requestUser) {
      await this.audit.log({
        userId: requestUser.userId,
        userRole: requestUser.role,
        action: AuditAction.DELETE,
        entityType: 'staff_document',
        entityId: documentId,
        summary: `Deleted document ${doc.documentType}: ${doc.fileName}`,
      });
    }
  }

  async getDocumentForDownload(
    documentId: string,
    requestUser: { userId: string; role: string },
  ): Promise<{ doc: StaffDocument; absPath: string }> {
    const doc = await this.documentsRepo.findOne({
      where: { id: documentId },
      relations: ['staff', 'staff.user'],
    });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }
    const targetUserId = doc.staff?.user?.id;
    if (!targetUserId) {
      throw new NotFoundException('Staff user not found for document');
    }
    const isSelf = requestUser.userId === targetUserId;
    if (!canViewOtherStaffProfiles(requestUser.role) && !isSelf) {
      throw new ForbiddenException('Access denied');
    }
    if (isPayrollDocumentType(doc.documentType) && !isPayrollRole(requestUser.role)) {
      throw new ForbiddenException('Payroll documents are restricted to Admin and HR');
    }
    if (isPayrollDocumentType(doc.documentType) && isPayrollRole(requestUser.role)) {
      await this.audit.log({
        userId: requestUser.userId,
        userRole: requestUser.role,
        action: AuditAction.VIEW_RESTRICTED,
        entityType: 'staff_document',
        entityId: doc.id,
        summary: `Downloaded payroll document ${doc.documentType}: ${doc.fileName}`,
      });
    }
    const absPath = path.join(process.cwd(), doc.filePath);
    if (!fs.existsSync(absPath)) {
      throw new NotFoundException('File not found on disk');
    }
    return { doc, absPath };
  }

  async findExpiring(withinDays: number): Promise<
    Array<{
      source: 'document' | 'dbs' | 'visa';
      staffProfileId: string;
      staffName: string;
      userId: string;
      documentType?: string;
      expiryDate: string;
      expiryStatus: DocumentExpiryStatus;
      daysUntilExpiry: number | null;
      documentId?: string;
      dbsRecordId?: string;
    }>
  > {
    const maxDays = Math.max(1, withinDays);
    const results: Array<{
      source: 'document' | 'dbs' | 'visa';
      staffProfileId: string;
      staffName: string;
      userId: string;
      documentType?: string;
      expiryDate: string;
      expiryStatus: DocumentExpiryStatus;
      daysUntilExpiry: number | null;
      documentId?: string;
      dbsRecordId?: string;
    }> = [];

    const docs = await this.documentsRepo
      .createQueryBuilder('d')
      .innerJoinAndSelect('d.staff', 'sp')
      .innerJoin('sp.user', 'u')
      .addSelect(['u.id'])
      .where('d.expiryDate IS NOT NULL')
      .andWhere('d.expiryDate <= :cutoff', {
        cutoff: this.datePlusDays(maxDays),
      })
      .getMany();

    for (const d of docs) {
      const status = computeDocumentExpiryStatus(d.expiryDate, this.warnTiers);
      if (status === 'VALID' || status === 'NO_EXPIRY') continue;
      const staff = d.staff as StaffProfile & { user?: { id: string } };
      results.push({
        source: 'document',
        staffProfileId: d.staffId,
        staffName: `${staff.firstName} ${staff.lastName}`,
        userId: (staff as any).user?.id || '',
        documentType: d.documentType,
        expiryDate: d.expiryDate!,
        expiryStatus: status,
        daysUntilExpiry: daysUntil(d.expiryDate),
        documentId: d.id,
      });
    }

    const dbsRows = await this.dbsRepo
      .createQueryBuilder('dbs')
      .innerJoinAndSelect('dbs.staff', 'sp')
      .innerJoin('sp.user', 'u')
      .addSelect(['u.id'])
      .where('dbs.renewalDate IS NOT NULL')
      .andWhere('dbs.renewalDate <= :cutoff', {
        cutoff: this.datePlusDays(maxDays),
      })
      .getMany();

    for (const row of dbsRows) {
      const status = computeDbsRenewalStatus(row.renewalDate, this.warnTiers);
      if (status === 'VALID' || status === 'NO_EXPIRY') continue;
      const staff = row.staff as StaffProfile & { user?: { id: string } };
      results.push({
        source: 'dbs',
        staffProfileId: row.staffId,
        staffName: `${staff.firstName} ${staff.lastName}`,
        userId: (staff as any).user?.id || '',
        documentType: 'DBS',
        expiryDate: row.renewalDate!,
        expiryStatus: status,
        daysUntilExpiry: daysUntil(row.renewalDate),
        dbsRecordId: row.id,
      });
    }

    const visaProfiles = await this.staffRepo
      .createQueryBuilder('sp')
      .innerJoinAndSelect('sp.user', 'u')
      .where('sp.visaExpiryDate IS NOT NULL')
      .andWhere('sp.visaExpiryDate <= :cutoff', {
        cutoff: this.datePlusDays(maxDays),
      })
      .getMany();

    for (const sp of visaProfiles) {
      const visaStr =
        sp.visaExpiryDate instanceof Date
          ? sp.visaExpiryDate.toISOString().slice(0, 10)
          : String(sp.visaExpiryDate).slice(0, 10);
      const status = computeDocumentExpiryStatus(visaStr, this.warnTiers);
      if (status === 'VALID' || status === 'NO_EXPIRY') continue;
      results.push({
        source: 'visa',
        staffProfileId: sp.id,
        staffName: `${sp.firstName} ${sp.lastName}`,
        userId: sp.user.id,
        documentType: 'VISA',
        expiryDate: visaStr,
        expiryStatus: status,
        daysUntilExpiry: daysUntil(visaStr),
      });
    }

    return results.sort((a, b) => (a.daysUntilExpiry ?? 999) - (b.daysUntilExpiry ?? 999));
  }

  private datePlusDays(days: number): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  private async processDbsDeclarationDueReminders(): Promise<{
    processed: number;
    notifications: number;
    reminders: number;
    errors: number;
  }> {
    const dueRows = await this.dbsRepo.query(
      `
      SELECT
        d.id AS "dbsRecordId",
        d."staffId" AS "staffProfileId",
        d."issueDate" AS "issueDate",
        d."lastDeclarationDate" AS "lastDeclarationDate",
        d."nextDeclarationDate" AS "nextDeclarationDate",
        d."lastDeclarationReminderSentAt" AS "lastDeclarationReminderSentAt",
        sp."firstName" AS "firstName",
        sp."lastName" AS "lastName",
        sp."lcaNumber" AS "lcaNumber",
        sp."ilccsNumber" AS "ilccsNumber",
        COALESCE(
          d."nextDeclarationDate",
          (COALESCE(d."lastDeclarationDate", d."issueDate") + INTERVAL '1 year')::date
        ) AS "dueDate"
      FROM dbs_records d
      INNER JOIN staff_profiles sp ON sp.id = d."staffId"
      INNER JOIN users u ON u.id = sp."userId"
      WHERE u.role = 'STAFF'
        AND (
          (d."nextDeclarationDate" IS NOT NULL
            AND d."nextDeclarationDate" <= (CURRENT_DATE + ($1::int * INTERVAL '1 day')))
          OR (
            d."nextDeclarationDate" IS NULL
            AND COALESCE(d."lastDeclarationDate", d."issueDate") IS NOT NULL
            AND (COALESCE(d."lastDeclarationDate", d."issueDate") + INTERVAL '1 year')
                <= (CURRENT_DATE + ($1::int * INTERVAL '1 day'))
          )
        )
      `,
      [this.dbsDeclarationWarnDays],
    );

    const admins = await this.usersRepo.find({
      where: { role: UserRole.ADMIN, isActive: true },
      select: ['id'],
    });
    if (!admins.length) {
      return { processed: dueRows.length, notifications: 0, reminders: 0, errors: 0 };
    }

    let notifications = 0;
    let reminders = 0;
    let errors = 0;

    for (const row of dueRows) {
      try {
        const dueDate = row.dueDate ? new Date(row.dueDate) : null;
        const lastSent = row.lastDeclarationReminderSentAt
          ? new Date(row.lastDeclarationReminderSentAt)
          : null;
        if (dueDate && lastSent && lastSent >= dueDate) {
          continue;
        }

        const staffName = `${row.firstName || ''} ${row.lastName || ''}`.replace(/\s+/g, ' ').trim();
        const lcacs = row.lcaNumber || row.ilccsNumber || 'N/A';
        const title = 'DBS declaration due';
        const message = `Annual DBS declaration due for ${staffName} (LCACS: ${lcacs}).`;
        const dedupeKey = `dbs-declaration-${row.dbsRecordId}-${String(row.dueDate).slice(0, 10)}`;
        const now = new Date();

        for (const admin of admins) {
          await this.notificationsService.createForUser(admin.id, title, message, {
            kind: 'dbs_declaration_due',
            dedupeKey,
            dbsRecordId: row.dbsRecordId,
            staffProfileId: row.staffProfileId,
            staffName,
            lcacsNumber: lcacs,
            dueDate: row.dueDate,
          });
          notifications++;

          const reminder = this.remindersRepo.create({
            userId: admin.id,
            type: 'dbs_declaration_due',
            message,
            scheduledAt: now,
            sent: true,
            sentAt: now,
            metadata: {
              dedupeKey,
              dbsRecordId: row.dbsRecordId,
              staffProfileId: row.staffProfileId,
              staffName,
              lcacsNumber: lcacs,
              dueDate: row.dueDate,
            },
          });
          await this.remindersRepo.save(reminder);
          reminders++;
        }

        await this.dbsRepo.update(
          { id: row.dbsRecordId },
          { lastDeclarationReminderSentAt: now },
        );
      } catch (e) {
        errors++;
        this.logger.error(`DBS declaration reminder failed for dbsRecord=${row.dbsRecordId}`, e);
      }
    }

    return {
      processed: dueRows.length,
      notifications,
      reminders,
      errors,
    };
  }

  async getDbsForStaff(staffProfileId: string) {
    const record = await this.dbsRepo.findOne({
      where: { staffId: staffProfileId },
      relations: ['certificateDocument'],
    });
    if (!record) return null;
    return {
      ...record,
      renewalStatus: computeDbsRenewalStatus(record.renewalDate, this.warnTiers),
      daysUntilRenewal: daysUntil(record.renewalDate),
    };
  }

  async createDbs(staffProfileId: string, dto: CreateDbsRecordDto) {
    const existing = await this.dbsRepo.findOne({ where: { staffId: staffProfileId } });
    if (existing) {
      throw new BadRequestException('DBS record already exists for this staff member. Use PATCH to update.');
    }
    if (dto.certificateDocumentId) {
      await this.assertDocumentBelongsToStaff(dto.certificateDocumentId, staffProfileId);
    }
    const record = this.dbsRepo.create({
      staffId: staffProfileId,
      dbsNumber: dto.dbsNumber,
      issueDate: dto.issueDate || null,
      renewalDate: dto.renewalDate || null,
      nextDeclarationDate: dto.nextDeclarationDate || null,
      updateServiceStatus: dto.updateServiceStatus ?? false,
      certificateDocumentId: dto.certificateDocumentId || null,
      dbsCertificateNumber: dto.dbsCertificateNumber || null,
      enrolledDate: dto.enrolledDate || null,
    });
    const saved = await this.dbsRepo.save(record);
    return {
      ...saved,
      renewalStatus: computeDbsRenewalStatus(saved.renewalDate, this.warnTiers),
      daysUntilRenewal: daysUntil(saved.renewalDate),
    };
  }

  async updateDbs(recordId: string, dto: UpdateDbsRecordDto) {
    const record = await this.dbsRepo.findOne({ where: { id: recordId } });
    if (!record) {
      throw new NotFoundException('DBS record not found');
    }
    if (dto.certificateDocumentId) {
      await this.assertDocumentBelongsToStaff(dto.certificateDocumentId, record.staffId);
    }
    Object.assign(record, {
      ...(dto.dbsNumber !== undefined ? { dbsNumber: dto.dbsNumber } : {}),
      ...(dto.issueDate !== undefined ? { issueDate: dto.issueDate } : {}),
      ...(dto.renewalDate !== undefined ? { renewalDate: dto.renewalDate } : {}),
      ...(dto.nextDeclarationDate !== undefined
        ? { nextDeclarationDate: dto.nextDeclarationDate }
        : {}),
      ...(dto.updateServiceStatus !== undefined
        ? { updateServiceStatus: dto.updateServiceStatus }
        : {}),
      ...(dto.certificateDocumentId !== undefined
        ? { certificateDocumentId: dto.certificateDocumentId }
        : {}),
      ...(dto.dbsCertificateNumber !== undefined
        ? { dbsCertificateNumber: dto.dbsCertificateNumber }
        : {}),
      ...(dto.enrolledDate !== undefined ? { enrolledDate: dto.enrolledDate } : {}),
    });
    const saved = await this.dbsRepo.save(record);
    return {
      ...saved,
      renewalStatus: computeDbsRenewalStatus(saved.renewalDate, this.warnTiers),
      daysUntilRenewal: daysUntil(saved.renewalDate),
    };
  }

  private async assertDocumentBelongsToStaff(documentId: string, staffProfileId: string) {
    const doc = await this.documentsRepo.findOne({ where: { id: documentId } });
    if (!doc || doc.staffId !== staffProfileId) {
      throw new BadRequestException('Certificate document must belong to this staff member');
    }
  }

  /**
   * Creates in-app notifications and optional n8n reminder rows for documents/DBS/visa nearing expiry.
   * Called from process-reference-reminders cron script.
   */
  async processExpiryReminders(): Promise<{
    processed: number;
    notifications: number;
    reminders: number;
    errors: number;
  }> {
    const notifyWindow = Math.max(...this.warnTiers);
    const items = await this.findExpiring(notifyWindow);
    let notifications = 0;
    let reminders = 0;
    let errors = 0;

    const cooldownCutoff = new Date();
    cooldownCutoff.setDate(cooldownCutoff.getDate() - this.notifyCooldownDays);

    for (const item of items) {
      if (!item.userId) continue;
      try {
        const dedupeKey =
          item.documentId ||
          item.dbsRecordId ||
          `visa-${item.staffProfileId}`;
        const recent = await this.remindersRepo
          .createQueryBuilder('r')
          .where('r.user_id = :userId', { userId: item.userId })
          .andWhere("r.type = 'document_expiry'")
          .andWhere('r.sent = true')
          .andWhere("r.metadata->>'dedupeKey' = :dedupeKey", { dedupeKey })
          .andWhere('r.sent_at > :cutoff', { cutoff: cooldownCutoff })
          .getOne();
        if (recent) {
          continue;
        }

        const title =
          item.expiryStatus === 'EXPIRED'
            ? 'Document expired'
            : 'Document expiring soon';
        const message = `${item.documentType || item.source} for ${item.staffName} ${
          item.expiryStatus === 'EXPIRED' ? 'expired' : `expires`
        } on ${item.expiryDate} (${item.daysUntilExpiry ?? '?'} days).`;

        await this.notificationsService.createForUser(item.userId, title, message, {
          kind: 'document_expiry',
          dedupeKey,
          staffProfileId: item.staffProfileId,
          documentId: item.documentId,
          dbsRecordId: item.dbsRecordId,
          expiryDate: item.expiryDate,
        });
        notifications++;

        const reminder = this.remindersRepo.create({
          userId: item.userId,
          type: 'document_expiry',
          message,
          scheduledAt: new Date(),
          sent: true,
          sentAt: new Date(),
          metadata: {
            dedupeKey,
            staffProfileId: item.staffProfileId,
            documentId: item.documentId,
            dbsRecordId: item.dbsRecordId,
            expiryDate: item.expiryDate,
            expiryStatus: item.expiryStatus,
          },
        });
        await this.remindersRepo.save(reminder);
        reminders++;
      } catch (e) {
        errors++;
        this.logger.error(`Expiry reminder failed for ${item.staffProfileId}`, e);
      }
    }

    const dbsDeclaration = await this.processDbsDeclarationDueReminders();

    return {
      processed: items.length + dbsDeclaration.processed,
      notifications: notifications + dbsDeclaration.notifications,
      reminders: reminders + dbsDeclaration.reminders,
      errors: errors + dbsDeclaration.errors,
    };
  }
}
