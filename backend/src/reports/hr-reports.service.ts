import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import PDFDocument from 'pdfkit';
import { StaffProfile } from '../staff/staff-profile.entity';

function bufferFromDoc(doc: InstanceType<typeof PDFDocument>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

export type HrReportPreviewResult<T extends Record<string, unknown> = Record<string, unknown>> = {
  count: number;
  rows: T[];
};

@Injectable()
export class HrReportsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  private createListPdf(title: string, headers: string[], rows: string[][]) {
    const doc = new PDFDocument({ size: 'A4', margin: 40, layout: 'landscape' });
    doc.fontSize(16).fillColor('#00659D').text(title, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor('#666').text(`Generated: ${new Date().toLocaleString('en-GB')}`, { align: 'right' });
    doc.moveDown(1);
    doc.fontSize(9).fillColor('#000');

    const colW = (doc.page.width - 80) / headers.length;
    let y = doc.y;
    headers.forEach((h, i) => {
      doc.font('Helvetica-Bold').text(h, 40 + i * colW, y, { width: colW - 4, continued: false });
    });
    y += 14;
    doc.font('Helvetica');
    for (const row of rows) {
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = 40;
      }
      row.forEach((cell, i) => {
        doc.text(cell || '-', 40 + i * colW, y, { width: colW - 4 });
      });
      y += 12;
    }
    return bufferFromDoc(doc);
  }

  private toBool(v: unknown): boolean {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    if (typeof v === 'string') return ['true', '1', 't', 'yes', 'y'].includes(v.toLowerCase());
    return false;
  }

  private failedChecks(row: Record<string, unknown>) {
    const failed: string[] = [];
    if (!this.toBool(row.dbs_ok)) failed.push('DBS');
    if (!this.toBool(row.visa_ok)) failed.push('Visa/RTW');
    if (!this.toBool(row.training_ok)) failed.push('Training');
    if (!this.toBool(row.references_ok)) failed.push('References');
    if (!this.toBool(row.policies_ok)) failed.push('Policies');
    return failed;
  }

  private staffName(r: { firstName?: string; lastName?: string }) {
    return [r.firstName, r.lastName].filter(Boolean).join(' ').trim() || r.firstName || 'Staff';
  }

  private async queryDbsRenewalRows() {
    const warn = parseInt(process.env.DOCUMENT_EXPIRY_WARN_DAYS?.split(',')[0] || '90', 10);
    return this.dataSource.query(
      `
      SELECT sp."userId", sp."firstName", sp."lastName",
             COALESCE(sp."lcaNumber", sp."ilccsNumber") AS lcacs,
             d."dbsNumber",
             d."renewalDate"::text AS "renewalDate",
             d."issueDate"::text AS "issueDate",
             (d."renewalDate" - CURRENT_DATE)::int AS "daysUntilExpiry"
      FROM dbs_records d
      JOIN staff_profiles sp ON sp.id = d."staffId"
      WHERE d."renewalDate" IS NOT NULL
        AND d."renewalDate" <= CURRENT_DATE + ($1::int * INTERVAL '1 day')
      ORDER BY d."renewalDate" ASC
      `,
      [warn],
    );
  }

  private async queryVisaExpiryRows() {
    const warn = parseInt(process.env.DOCUMENT_EXPIRY_WARN_DAYS?.split(',')[0] || '90', 10);
    return this.dataSource.query(
      `
      SELECT sp."userId", sp."firstName", sp."lastName",
             COALESCE(sp."lcaNumber", sp."ilccsNumber") AS lcacs,
             sp."visaType",
             COALESCE(sp."visaOrBrpNumber", sp."shareCode") AS "visaOrBrpNumber",
             sp."visaExpiryDate"::text AS "expiryDate",
             sp."rightToWorkStatus", sp."shareCode"
      FROM staff_profiles sp
      WHERE sp."visaExpiryDate" IS NOT NULL
        AND sp."visaExpiryDate" <= CURRENT_DATE + ($1::int * INTERVAL '1 day')
      ORDER BY sp."visaExpiryDate" ASC
      `,
      [warn],
    );
  }

  private async queryMissingReferenceRows() {
    return this.dataSource.query(`
      SELECT sp."userId", sp."firstName", sp."lastName",
             COALESCE(sp."lcaNumber", sp."ilccsNumber") AS lcacs,
             COUNT(r.id) FILTER (WHERE r.status IN ('submitted','completed'))::int AS "referencesReceived",
             COUNT(r.id)::int AS total
      FROM staff_profiles sp
      LEFT JOIN "references" r ON r."staffId" = sp.id
      JOIN users u ON u.id = sp."userId" AND u.role = 'STAFF'
      GROUP BY sp.id, sp."userId", sp."firstName", sp."lastName", sp."lcaNumber", sp."ilccsNumber"
      HAVING COUNT(r.id) FILTER (WHERE r.status IN ('submitted','completed')) < 2
      ORDER BY "referencesReceived" ASC, sp."lastName"
    `);
  }

  private async queryTrainingComplianceRows() {
    return this.dataSource.query(`
      SELECT sp."userId", sp."firstName", sp."lastName", sp."ilccsNumber",
             COALESCE(sp."lcaNumber", sp."ilccsNumber") AS lcacs,
             tr."courseName", tr.status, tr."dueDate"::text, tr."completedAt"::text
      FROM training_records tr
      JOIN users u ON u.id = tr."userId"
      JOIN staff_profiles sp ON sp."userId" = u.id
      WHERE tr.status = 'PENDING'
      ORDER BY tr."dueDate" NULLS LAST, sp."lastName"
    `);
  }

  private async querySupervisionOverdueRows() {
    return this.dataSource.query(`
      SELECT sp."userId", sp."firstName", sp."lastName",
             COALESCE(sp."lcaNumber", sp."ilccsNumber") AS lcacs,
             MAX(rf."dateOfReview")::text AS "lastSupervisionDate"
      FROM staff_profiles sp
      JOIN users u ON u.id = sp."userId" AND u.role = 'STAFF'
      LEFT JOIN review_forms rf ON rf."staffId" = sp.id AND rf."formType" = 'supervision'
      WHERE u."createdAt" < NOW() - INTERVAL '90 days'
      GROUP BY sp.id, sp."userId", sp."firstName", sp."lastName", sp."lcaNumber", sp."ilccsNumber"
      HAVING MAX(rf."dateOfReview") IS NULL OR MAX(rf."dateOfReview") < CURRENT_DATE - INTERVAL '180 days'
      ORDER BY "lastSupervisionDate" NULLS FIRST
    `);
  }

  private async queryAppraisalDueRows() {
    return this.dataSource.query(`
      SELECT sp."userId", sp."firstName", sp."lastName",
             COALESCE(sp."lcaNumber", sp."ilccsNumber") AS lcacs,
             MAX(rf."dateOfReview")::text AS "lastAppraisalDate"
      FROM staff_profiles sp
      JOIN users u ON u.id = sp."userId" AND u.role = 'STAFF'
      LEFT JOIN review_forms rf ON rf."staffId" = sp.id AND rf."formType" = 'appraisal'
      WHERE u."createdAt" < NOW() - INTERVAL '365 days'
      GROUP BY sp.id, sp."userId", sp."firstName", sp."lastName", sp."lcaNumber", sp."ilccsNumber"
      HAVING MAX(rf."dateOfReview") IS NULL OR MAX(rf."dateOfReview") < CURRENT_DATE - INTERVAL '365 days'
      ORDER BY "lastAppraisalDate" NULLS FIRST
    `);
  }

  private async queryStaffTurnoverRows() {
    return this.dataSource.query(`
      SELECT sp."userId", sp."firstName", sp."lastName",
             COALESCE(sp."lcaNumber", sp."ilccsNumber") AS lcacs,
             sp."employmentStatus", u."createdAt"::text, u."lastLoginAt"::text,
             u."updatedAt"::text AS "statusChangedDate"
      FROM staff_profiles sp
      JOIN users u ON u.id = sp."userId"
      WHERE UPPER(COALESCE(sp."employmentStatus"::text, '')) IN ('LEFT', 'LEAVER', 'INACTIVE')
         OR COALESCE(sp."employmentStatus"::text, '') ILIKE '%left%'
      ORDER BY u."lastLoginAt" DESC NULLS LAST
    `);
  }

  private async queryCqcAuditSummary() {
    const [summary] = await this.dataSource.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'STAFF')::int AS total_staff,
        (SELECT COUNT(*) FROM dbs_records WHERE "renewalDate" >= CURRENT_DATE OR "renewalDate" IS NULL)::int AS dbs_ok,
        (SELECT COUNT(*) FROM staff_profiles WHERE "visaExpiryDate" IS NULL OR "visaExpiryDate" >= CURRENT_DATE)::int AS visa_ok,
        (SELECT COUNT(*) FROM training_records WHERE status = 'COMPLETED')::int AS training_completed,
        (SELECT COUNT(*) FROM training_records WHERE status = 'PENDING')::int AS training_pending,
        (SELECT COUNT(*) FROM "references" WHERE status = 'submitted')::int AS refs_submitted,
        (SELECT COUNT(*) FROM policy_reading_sessions WHERE status = 'COMPLETED')::int AS policies_read
    `);
    return summary;
  }

  private async queryCqcAuditStaffRows() {
    return this.dataSource.query(`
      WITH staff_base AS (
        SELECT
          u.id AS "userId",
          sp.id AS "staffId",
          sp."firstName",
          sp."lastName",
          COALESCE(sp."lcaNumber", sp."ilccsNumber", '-') AS lcacs,
          COALESCE(sp."employmentStatus"::text, 'ACTIVE') AS "employmentStatus",
          sp."visaExpiryDate" AS visa_expiry
        FROM users u
        INNER JOIN staff_profiles sp ON sp."userId" = u.id
        WHERE u.role = 'STAFF'
      )
      SELECT
        sb.*,
        EXISTS (
          SELECT 1 FROM dbs_records d
          WHERE d."staffId" = sb."staffId"
            AND (d."renewalDate" IS NULL OR d."renewalDate" >= CURRENT_DATE)
        ) AS dbs_ok,
        (sb.visa_expiry IS NULL OR sb.visa_expiry >= CURRENT_DATE) AS visa_ok,
        NOT EXISTS (
          SELECT 1 FROM training_records tr
          WHERE tr."userId" = sb."userId"
            AND tr.status = 'PENDING'
            AND (
              (tr."dueDate" IS NOT NULL AND tr."dueDate" <= CURRENT_DATE + INTERVAL '30 days')
              OR (tr."dueDate" IS NULL AND tr."enrollmentDate" < NOW() - INTERVAL '30 days')
            )
        ) AS training_ok,
        (
          SELECT COUNT(*) FROM "references" r
          WHERE r."staffId" = sb."staffId"
            AND r.status IN ('submitted', 'completed')
        ) >= 2 AS references_ok,
        EXISTS (
          SELECT 1 FROM policy_reading_sessions prs
          WHERE prs."staffId" = sb."staffId"
            AND prs.status = 'COMPLETED'
            AND prs."endTime" >= NOW() - INTERVAL '90 days'
        ) AS policies_ok
      FROM staff_base sb
      ORDER BY sb."lastName" NULLS LAST, sb."firstName" NULLS LAST
    `);
  }

  private daysUntil(dateStr: string | null | undefined): number | null {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  private daysOverdue(lastDateStr: string | null | undefined, thresholdDays: number): number | null {
    if (!lastDateStr) return thresholdDays + 1;
    const d = new Date(lastDateStr);
    if (Number.isNaN(d.getTime())) return thresholdDays + 1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    const daysSince = Math.round((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince < thresholdDays) return null;
    return daysSince - thresholdDays;
  }

  private complianceLabel(ok: unknown): string {
    return this.toBool(ok) ? 'Compliant' : 'Non-compliant';
  }

  async previewDbsRenewal(): Promise<HrReportPreviewResult> {
    const rows = await this.queryDbsRenewalRows();
    return {
      count: rows.length,
      rows: rows.map((r: Record<string, unknown>) => ({
        userId: r.userId,
        name: this.staffName(r as { firstName?: string; lastName?: string }),
        lcacs: r.lcacs || '-',
        dbsNumber: r.dbsNumber || '-',
        renewalDate: r.renewalDate || '-',
        daysUntilExpiry: r.daysUntilExpiry ?? this.daysUntil(String(r.renewalDate || '')),
      })),
    };
  }

  async previewVisaExpiry(): Promise<HrReportPreviewResult> {
    const rows = await this.queryVisaExpiryRows();
    return {
      count: rows.length,
      rows: rows.map((r: Record<string, unknown>) => {
        const daysUntilExpiry = this.daysUntil(String(r.expiryDate || ''));
        return {
          userId: r.userId,
          name: this.staffName(r as { firstName?: string; lastName?: string }),
          lcacs: r.lcacs || '-',
          visaType: r.visaType || r.rightToWorkStatus || '-',
          visaOrBrpNumber: r.visaOrBrpNumber || '-',
          expiryDate: r.expiryDate || '-',
          daysUntilExpiry,
        };
      }),
    };
  }

  async previewMissingReference(): Promise<HrReportPreviewResult> {
    const rows = await this.queryMissingReferenceRows();
    return {
      count: rows.length,
      rows: rows.map((r: Record<string, unknown>) => ({
        userId: r.userId,
        name: this.staffName(r as { firstName?: string; lastName?: string }),
        lcacs: r.lcacs || '-',
        referencesReceived: r.referencesReceived ?? 0,
        referencesRequired: 2,
      })),
    };
  }

  async previewTrainingCompliance(): Promise<HrReportPreviewResult> {
    const raw = await this.queryTrainingComplianceRows();
    const byStaff = new Map<string, Record<string, unknown>>();
    for (const r of raw) {
      const key = String(r.userId);
      const existing = byStaff.get(key);
      const due = r.dueDate ? String(r.dueDate) : null;
      if (!existing) {
        byStaff.set(key, {
          userId: r.userId,
          name: this.staffName(r as { firstName?: string; lastName?: string }),
          lcacs: r.lcacs || r.ilccsNumber || '-',
          pendingTrainingItems: 1,
          oldestDueDate: due,
        });
      } else {
        existing.pendingTrainingItems = Number(existing.pendingTrainingItems) + 1;
        const currentOldest = existing.oldestDueDate as string | null;
        if (due && (!currentOldest || due < currentOldest)) {
          existing.oldestDueDate = due;
        }
      }
    }
    const rows = Array.from(byStaff.values());
    return { count: rows.length, rows };
  }

  async previewSupervisionOverdue(): Promise<HrReportPreviewResult> {
    const rows = await this.querySupervisionOverdueRows();
    return {
      count: rows.length,
      rows: rows.map((r: Record<string, unknown>) => ({
        userId: r.userId,
        name: this.staffName(r as { firstName?: string; lastName?: string }),
        lcacs: r.lcacs || '-',
        lastSupervisionDate: r.lastSupervisionDate || 'Never',
        daysOverdue: this.daysOverdue(
          r.lastSupervisionDate ? String(r.lastSupervisionDate) : null,
          180,
        ),
      })),
    };
  }

  async previewAppraisalDue(): Promise<HrReportPreviewResult> {
    const rows = await this.queryAppraisalDueRows();
    return {
      count: rows.length,
      rows: rows.map((r: Record<string, unknown>) => ({
        userId: r.userId,
        name: this.staffName(r as { firstName?: string; lastName?: string }),
        lcacs: r.lcacs || '-',
        lastAppraisalDate: r.lastAppraisalDate || 'Never',
        daysOverdue: this.daysOverdue(
          r.lastAppraisalDate ? String(r.lastAppraisalDate) : null,
          365,
        ),
      })),
    };
  }

  async previewStaffTurnover(): Promise<HrReportPreviewResult> {
    const rows = await this.queryStaffTurnoverRows();
    return {
      count: rows.length,
      rows: rows.map((r: Record<string, unknown>) => ({
        userId: r.userId,
        name: this.staffName(r as { firstName?: string; lastName?: string }),
        lcacs: r.lcacs || '-',
        employmentStatus: r.employmentStatus || '-',
        statusChangedDate: r.statusChangedDate || r.lastLoginAt || r.createdAt || '-',
      })),
    };
  }

  async previewCqcAudit(): Promise<HrReportPreviewResult> {
    const rows = await this.queryCqcAuditStaffRows();
    return {
      count: rows.length,
      rows: rows.map((r: Record<string, unknown>) => {
        const failed = this.failedChecks(r);
        return {
          userId: r.userId,
          name: this.staffName(r as { firstName?: string; lastName?: string }),
          lcacs: r.lcacs || '-',
          dbsStatus: this.complianceLabel(r.dbs_ok),
          visaStatus: this.complianceLabel(r.visa_ok),
          trainingStatus: this.complianceLabel(r.training_ok),
          referencesStatus: this.complianceLabel(r.references_ok),
          overallCompliance: failed.length === 0 ? 'Compliant' : `Non-compliant (${failed.join(', ')})`,
        };
      }),
    };
  }

  async generateDbsRenewalReport(): Promise<Buffer> {
    const rows = await this.queryDbsRenewalRows();
    return this.createListPdf(
      'DBS Renewal Report',
      ['Name', 'ILCCS', 'Certificate', 'Issue', 'Renewal'],
      rows.map((r: Record<string, string>) => [
        this.staffName(r),
        r.lcacs || r.ilccsNumber || '-',
        r.dbsNumber || '-',
        r.issueDate || '-',
        r.renewalDate || '-',
      ]),
    );
  }

  async generateVisaExpiryReport(): Promise<Buffer> {
    const rows = await this.queryVisaExpiryRows();
    return this.createListPdf(
      'Visa Expiry Report',
      ['Name', 'ILCCS', 'Expiry', 'RTW Status', 'Share Code'],
      rows.map((r: Record<string, string>) => [
        this.staffName(r),
        r.lcacs || '-',
        r.expiryDate || r.visaExpiryDate || '-',
        r.rightToWorkStatus || '-',
        r.shareCode || '-',
      ]),
    );
  }

  async generateMissingReferenceReport(): Promise<Buffer> {
    const rows = await this.queryMissingReferenceRows();
    return this.createListPdf(
      'Missing Reference Report',
      ['Name', 'ILCCS', 'Submitted', 'Total Requests'],
      rows.map((r: Record<string, number | string>) => [
        this.staffName(r),
        String(r.lcacs || '-'),
        String(r.referencesReceived ?? 0),
        String(r.total ?? 0),
      ]),
    );
  }

  async generateTrainingComplianceReport(): Promise<Buffer> {
    const rows = await this.queryTrainingComplianceRows();
    return this.createListPdf(
      'Training Compliance Report',
      ['Name', 'ILCCS', 'Course', 'Status', 'Due', 'Completed'],
      rows.map((r: Record<string, string>) => [
        this.staffName(r),
        r.lcacs || r.ilccsNumber || '-',
        r.courseName || '-',
        r.status || '-',
        r.dueDate || '-',
        r.completedAt || '-',
      ]),
    );
  }

  async generateSupervisionOverdueReport(): Promise<Buffer> {
    const rows = await this.querySupervisionOverdueRows();
    return this.createListPdf(
      'Supervision Overdue Report',
      ['Name', 'ILCCS', 'Last Supervision'],
      rows.map((r: Record<string, string>) => [
        this.staffName(r),
        r.lcacs || '-',
        r.lastSupervisionDate || 'Never',
      ]),
    );
  }

  async generateAppraisalDueReport(): Promise<Buffer> {
    const rows = await this.queryAppraisalDueRows();
    return this.createListPdf(
      'Appraisal Due Report',
      ['Name', 'ILCCS', 'Last Appraisal'],
      rows.map((r: Record<string, string>) => [
        this.staffName(r),
        r.lcacs || '-',
        r.lastAppraisalDate || 'Never',
      ]),
    );
  }

  async generateStaffTurnoverReport(): Promise<Buffer> {
    const rows = await this.queryStaffTurnoverRows();
    return this.createListPdf(
      'Staff Turnover Report',
      ['Name', 'ILCCS', 'Status', 'Joined', 'Last Login'],
      rows.map((r: Record<string, string>) => [
        this.staffName(r),
        r.lcacs || '-',
        r.employmentStatus || '-',
        r.createdAt || '-',
        r.lastLoginAt || '-',
      ]),
    );
  }

  async generateCqcAuditReport(): Promise<Buffer> {
    const s = (await this.queryCqcAuditSummary()) || {};

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.fontSize(18).fillColor('#00659D').text('CQC Audit Summary Report', { align: 'center' });
    doc.moveDown(1);
    const lines: [string, string][] = [
      ['Total Staff (STAFF role)', String(s.total_staff ?? 0)],
      ['DBS records valid / on file', String(s.dbs_ok ?? 0)],
      ['Visa / RTW not expired', String(s.visa_ok ?? 0)],
      ['Training completed records', String(s.training_completed ?? 0)],
      ['Training pending records', String(s.training_pending ?? 0)],
      ['References submitted', String(s.refs_submitted ?? 0)],
      ['Policy reading sessions completed', String(s.policies_read ?? 0)],
    ];
    doc.fontSize(12);
    for (const [label, value] of lines) {
      doc.font('Helvetica-Bold').text(`${label}: `, { continued: true });
      doc.font('Helvetica').text(value);
      doc.moveDown(0.5);
    }
    doc.moveDown(1);
    doc.fontSize(10).fillColor('#666').text(
      'This summary supports CQC evidence gathering. Run individual compliance reports for staff-level detail.',
    );
    return bufferFromDoc(doc);
  }

  async generateComplianceReportOrg(): Promise<Buffer> {
    const rows = await this.queryCqcAuditStaffRows();

    const total = rows.length;
    const nonCompliant = rows.filter((r: Record<string, unknown>) => this.failedChecks(r).length > 0);
    const compliant = total - nonCompliant.length;

    return this.createListPdf(
      'Whole Organisation Compliance Report',
      ['Metric', 'Value'],
      [
        ['Total staff', String(total)],
        ['Compliant staff', String(compliant)],
        ['Non-compliant staff', String(nonCompliant.length)],
      ].concat(
        nonCompliant.slice(0, 200).map((r: Record<string, unknown>) => [
          this.staffName(r as { firstName?: string; lastName?: string }),
          `${r.lcacs || '-'} | Failed: ${this.failedChecks(r).join(', ') || 'None'}`,
        ]),
      ),
    );
  }

  async generateComplianceReportForUser(userId: string): Promise<Buffer> {
    const [row] = await this.dataSource.query(
      `
      WITH staff_base AS (
        SELECT
          u.id AS "userId",
          sp.id AS "staffId",
          sp."firstName",
          sp."lastName",
          COALESCE(sp."lcaNumber", sp."ilccsNumber", '-') AS lcacs,
          COALESCE(sp."employmentStatus"::text, 'ACTIVE') AS "employmentStatus",
          sp."visaExpiryDate" AS visa_expiry
        FROM users u
        INNER JOIN staff_profiles sp ON sp."userId" = u.id
        WHERE u.role = 'STAFF'
          AND u.id = $1
      )
      SELECT
        sb.*,
        EXISTS (
          SELECT 1 FROM dbs_records d
          WHERE d."staffId" = sb."staffId"
            AND (d."renewalDate" IS NULL OR d."renewalDate" >= CURRENT_DATE)
        ) AS dbs_ok,
        (sb.visa_expiry IS NULL OR sb.visa_expiry >= CURRENT_DATE) AS visa_ok,
        NOT EXISTS (
          SELECT 1 FROM training_records tr
          WHERE tr."userId" = sb."userId"
            AND tr.status = 'PENDING'
            AND (
              (tr."dueDate" IS NOT NULL AND tr."dueDate" <= CURRENT_DATE + INTERVAL '30 days')
              OR (tr."dueDate" IS NULL AND tr."enrollmentDate" < NOW() - INTERVAL '30 days')
            )
        ) AS training_ok,
        (
          SELECT COUNT(*) FROM "references" r
          WHERE r."staffId" = sb."staffId"
            AND r.status IN ('submitted', 'completed')
        ) >= 2 AS references_ok,
        EXISTS (
          SELECT 1 FROM policy_reading_sessions prs
          WHERE prs."staffId" = sb."staffId"
            AND prs.status = 'COMPLETED'
            AND prs."endTime" >= NOW() - INTERVAL '90 days'
        ) AS policies_ok
      FROM staff_base sb
      `,
      [userId],
    );

    if (!row) {
      return this.createListPdf(
        'Staff Compliance Report',
        ['Field', 'Value'],
        [['Error', 'Staff member not found']],
      );
    }

    const staffName = this.staffName(row);
    const statusLabel = (ok: boolean) => (ok ? 'Compliant' : 'Non-compliant');
    return this.createListPdf(
      `Compliance Report - ${staffName}`,
      ['Area', 'Status'],
      [
        ['Staff Name', staffName],
        ['LCACS', String(row.lcacs || '-')],
        ['Employment Status', String(row.employmentStatus || '-')],
        ['DBS', statusLabel(this.toBool(row.dbs_ok))],
        ['Visa / RTW', statusLabel(this.toBool(row.visa_ok))],
        ['Training', statusLabel(this.toBool(row.training_ok))],
        ['References', statusLabel(this.toBool(row.references_ok))],
        ['Policies', statusLabel(this.toBool(row.policies_ok))],
      ],
    );
  }

  async getRtwAnalytics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in30Days = new Date(today);
    in30Days.setDate(today.getDate() + 30);
    const in90Days = new Date(today);
    in90Days.setDate(today.getDate() + 90);

    const allStaff = await this.dataSource.getRepository(StaffProfile).find();

    const total = allStaff.length;
    const ukNationals = allStaff.filter((s) => s.isUkNational === true).length;
    const eeaNationals = allStaff.filter((s) => s.isEeaNational === true).length;
    const rtwCompleted = allStaff.filter((s) => s.rightToWorkCheckCompleted === true).length;
    const rtwNotCompleted = allStaff.filter((s) => !s.rightToWorkCheckCompleted).length;
    const shareCodeExpiring30 = allStaff.filter((s) => {
      if (!s.visaExpiryDate) return false;
      const exp = new Date(s.visaExpiryDate);
      return exp >= today && exp <= in30Days;
    }).length;
    const shareCodeExpiring90 = allStaff.filter((s) => {
      if (!s.visaExpiryDate) return false;
      const exp = new Date(s.visaExpiryDate);
      return exp >= today && exp <= in90Days;
    }).length;
    const shareCodeExpired = allStaff.filter((s) => {
      if (!s.visaExpiryDate) return false;
      return new Date(s.visaExpiryDate) < today;
    }).length;

    return {
      total,
      ukNationals,
      eeaNationals,
      rtwCompleted,
      rtwNotCompleted,
      shareCodeExpiring30,
      shareCodeExpiring90,
      shareCodeExpired,
    };
  }

  async getAllRtwForAnalytics() {
    const allStaff = await this.dataSource.query(
      `
      SELECT
        sp.id AS id,
        CONCAT(COALESCE(sp."firstName", ''), ' ', COALESCE(sp."lastName", '')) AS "staffName",
        sp."isUkNational" AS "isUkNational",
        sp."isEeaNational" AS "isEeaNational",
        sp."visaType" AS "visaType",
        sp."visaOrBrpNumber" AS "visaOrBrpNumber",
        sp."visaExpiryDate" AS "visaExpiryDate",
        sp."shareCode" AS "shareCode",
        sp."share_code_generated_date" AS "shareCodeGeneratedDate",
        sp."rightToWorkStatus" AS "rightToWorkStatus",
        sp."right_to_work_check_completed" AS "rightToWorkCheckCompleted",
        sp."right_to_work_check_date" AS "rightToWorkCheckDate",
        sp."right_to_work_check_expiry_date" AS "rightToWorkCheckExpiryDate"
      FROM staff_profiles sp
      ORDER BY sp."lastName" ASC NULLS LAST
      `,
    );

    return allStaff;
  }
}
