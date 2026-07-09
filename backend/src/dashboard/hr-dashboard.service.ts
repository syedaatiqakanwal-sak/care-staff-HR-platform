import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

const EMPTY_HR_STATS = {
  totalActive: 0,
  newStarters: 0,
  staffOnShadow: 0,
  dbsExpiringSoon: 0,
  dbsDeclarationDue: 0,
  shareCodeExpiring: 0,
  visaExpiringSoon: 0,
  trainingDue: 0,
  reviewsDue: 0,
  supervisionsDue: 0,
  appraisalsDue: 0,
  staffCompliancePercentage: 0,
  totalUsers: 0,
  activeUsers: 0,
  inactiveUsers: 0,
  users: [] as Array<Record<string, unknown>>,
};

@Injectable()
export class HrDashboardService {
  private readonly logger = new Logger(HrDashboardService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  private async safeCount(metricName: string, query: string, params: unknown[] = []): Promise<number> {
    try {
      const [row] = await this.dataSource.query(query, params);
      const value = Number(row?.count ?? 0);
      return Number.isFinite(value) ? value : 0;
    } catch (err) {
      this.logger.error(
        `${metricName} metric query failed`,
        err instanceof Error ? err.stack : err,
      );
      return 0;
    }
  }

  async getHrStats() {
    const expiryWarnDays = parseInt(process.env.DOCUMENT_EXPIRY_WARN_DAYS?.split(',')[0] || '60', 10);
    const declarationWarnDays = parseInt(process.env.DBS_DECLARATION_WARN_DAYS || '30', 10);
    const activeStatuses = ['ACTIVE'];

    const [
      totalUsers,
      totalActive,
      newStarters,
      staffOnShadow,
      dbsExpiringSoon,
      dbsDeclarationDue,
      shareCodeExpiring,
      visaExpiringSoon,
      trainingDue,
      reviewsDue,
      supervisionsDue,
      appraisalsDue,
      staffCompliancePercentage,
    ] = await Promise.all([
      this.safeCount(
        'totalUsers',
        `
        SELECT COUNT(*)::int AS count
        FROM users u
        INNER JOIN staff_profiles sp ON sp."userId" = u.id
        WHERE u.role = 'STAFF'
        `,
      ),
      this.safeCount(
        'totalActive',
        `
        SELECT COUNT(*)::int AS count
        FROM users u
        INNER JOIN staff_profiles sp ON sp."userId" = u.id
        WHERE u.role = 'STAFF'
          AND COALESCE(sp."employmentStatus"::text, 'ACTIVE') = ANY($1::text[])
        `,
        [activeStatuses],
      ),
      this.safeCount(
        'newStarters',
        `
        SELECT COUNT(*)::int AS count
        FROM users u
        INNER JOIN staff_profiles sp ON sp."userId" = u.id
        WHERE u.role = 'STAFF'
          AND COALESCE(sp.start_date, DATE(u."createdAt")) >= CURRENT_DATE - INTERVAL '90 days'
        `,
      ),
      this.safeCount(
        'staffOnShadow',
        `
        SELECT COUNT(*)::int AS count
        FROM users u
        INNER JOIN staff_profiles sp ON sp."userId" = u.id
        WHERE u.role = 'STAFF'
          AND COALESCE(sp."employmentStatus"::text, 'ACTIVE') = 'ON_SHADOW'
        `,
      ),
      this.safeCount(
        'dbsExpiringSoon',
        `
        SELECT COUNT(*)::int AS count
        FROM users u
        INNER JOIN staff_profiles sp ON sp."userId" = u.id
        WHERE u.role = 'STAFF'
          AND EXISTS (
            SELECT 1
            FROM dbs_records d
            WHERE d."staffId" = sp.id
              AND d."renewalDate" IS NOT NULL
              AND d."renewalDate" >= CURRENT_DATE
              AND d."renewalDate" <= CURRENT_DATE + ($1::int * INTERVAL '1 day')
          )
        `,
        [expiryWarnDays],
      ),
      this.safeCount(
        'dbsDeclarationDue',
        `
        SELECT COUNT(*)::int AS count
        FROM users u
        INNER JOIN staff_profiles sp ON sp."userId" = u.id
        WHERE u.role = 'STAFF'
          AND EXISTS (
            SELECT 1
            FROM dbs_records d
            WHERE d."staffId" = sp.id
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
          )
        `,
        [declarationWarnDays],
      ),
      this.safeCount(
        'shareCodeExpiring',
        `
        SELECT COUNT(*)::int AS count
        FROM users u
        INNER JOIN staff_profiles sp ON sp."userId" = u.id
        WHERE u.role = 'STAFF'
          AND sp."shareCode" IS NOT NULL
          AND TRIM(sp."shareCode") <> ''
          AND sp."visaExpiryDate" IS NOT NULL
          AND sp."visaExpiryDate" >= CURRENT_DATE
          AND sp."visaExpiryDate" <= CURRENT_DATE + ($1::int * INTERVAL '1 day')
        `,
        [expiryWarnDays],
      ),
      this.safeCount(
        'visaExpiringSoon',
        `
        SELECT COUNT(*)::int AS count
        FROM users u
        INNER JOIN staff_profiles sp ON sp."userId" = u.id
        WHERE u.role = 'STAFF'
          AND sp."visaExpiryDate" IS NOT NULL
          AND sp."visaExpiryDate" >= CURRENT_DATE
          AND sp."visaExpiryDate" <= CURRENT_DATE + ($1::int * INTERVAL '1 day')
        `,
        [expiryWarnDays],
      ),
      this.safeCount(
        'trainingDue',
        `
        SELECT COUNT(*)::int AS count
        FROM users u
        INNER JOIN staff_profiles sp ON sp."userId" = u.id
        WHERE u.role = 'STAFF'
          AND EXISTS (
            SELECT 1
            FROM training_records tr
            WHERE tr."userId" = u.id
              AND tr.status = 'PENDING'
              AND (
                (tr."dueDate" IS NOT NULL AND tr."dueDate" <= CURRENT_DATE + INTERVAL '30 days')
                OR (tr."dueDate" IS NULL AND tr."enrollmentDate" IS NOT NULL AND tr."enrollmentDate" < NOW() - INTERVAL '30 days')
              )
          )
        `,
      ),
      this.safeCount(
        'reviewsDue',
        `
        SELECT COUNT(*)::int AS count
        FROM users u
        INNER JOIN staff_profiles sp ON sp."userId" = u.id
        WHERE u.role = 'STAFF'
          AND COALESCE(sp.start_date, DATE(u."createdAt")) < CURRENT_DATE - INTERVAL '60 days'
          AND NOT EXISTS (
            SELECT 1
            FROM review_forms rf
            WHERE rf."staffId" = sp.id
              AND rf."formType" = 'review'
              AND rf."dateOfReview" >= CURRENT_DATE - INTERVAL '90 days'
          )
        `,
      ),
      this.safeCount(
        'supervisionsDue',
        `
        SELECT COUNT(*)::int AS count
        FROM users u
        INNER JOIN staff_profiles sp ON sp."userId" = u.id
        WHERE u.role = 'STAFF'
          AND COALESCE(sp.start_date, DATE(u."createdAt")) < CURRENT_DATE - INTERVAL '90 days'
          AND NOT EXISTS (
            SELECT 1
            FROM review_forms rf
            WHERE rf."staffId" = sp.id
              AND rf."formType" = 'supervision'
              AND rf."dateOfReview" >= CURRENT_DATE - INTERVAL '180 days'
          )
        `,
      ),
      this.safeCount(
        'appraisalsDue',
        `
        SELECT COUNT(*)::int AS count
        FROM users u
        INNER JOIN staff_profiles sp ON sp."userId" = u.id
        WHERE u.role = 'STAFF'
          AND COALESCE(sp.start_date, DATE(u."createdAt")) < CURRENT_DATE - INTERVAL '365 days'
          AND NOT EXISTS (
            SELECT 1
            FROM review_forms rf
            WHERE rf."staffId" = sp.id
              AND rf."formType" = 'appraisal'
              AND rf."dateOfReview" >= CURRENT_DATE - INTERVAL '365 days'
          )
        `,
      ),
      this.safeCount(
        'staffCompliancePercentage',
        `
        WITH staff_base AS (
          SELECT
            u.id AS user_id,
            sp.id AS staff_profile_id,
            sp."visaExpiryDate" AS visa_expiry
          FROM users u
          INNER JOIN staff_profiles sp ON sp."userId" = u.id
          WHERE u.role = 'STAFF'
            AND COALESCE(sp."employmentStatus"::text, 'ACTIVE') = ANY($1::text[])
        ),
        compliance AS (
          SELECT AVG(score)::float AS avg_compliance
          FROM (
            SELECT
              (
                (CASE WHEN EXISTS (
                  SELECT 1 FROM dbs_records d WHERE d."staffId" = sb.staff_profile_id
                    AND (d."renewalDate" IS NULL OR d."renewalDate" >= CURRENT_DATE)
                ) THEN 20 ELSE 0 END)
                + (CASE WHEN sb.visa_expiry IS NULL OR sb.visa_expiry >= CURRENT_DATE THEN 20 ELSE 0 END)
                + (CASE WHEN NOT EXISTS (
                  SELECT 1 FROM training_records tr
                  WHERE tr."userId" = sb.user_id AND tr.status = 'PENDING'
                    AND (
                      (tr."dueDate" IS NOT NULL AND tr."dueDate" < CURRENT_DATE + INTERVAL '30 days')
                      OR (tr."dueDate" IS NULL AND tr."enrollmentDate" < NOW() - INTERVAL '30 days')
                    )
                ) THEN 20 ELSE 0 END)
                + (CASE WHEN (
                  SELECT COUNT(*) FROM "references" r
                  WHERE r."staffId" = sb.staff_profile_id
                    AND r.status IN ('submitted', 'completed')
                ) >= 2 THEN 20 ELSE 0 END)
                + (CASE WHEN EXISTS (
                  SELECT 1 FROM policy_reading_sessions prs
                  WHERE prs."staffId" = sb.staff_profile_id
                    AND prs.status = 'COMPLETED'
                    AND prs."endTime" >= NOW() - INTERVAL '90 days'
                ) THEN 20 ELSE 0 END)
              ) AS score
            FROM staff_base sb
          ) per_staff
        )
        SELECT ROUND(COALESCE(avg_compliance, 0))::int AS count
        FROM compliance
        `,
        [activeStatuses],
      ),
    ]);

    let usersRaw: Record<string, unknown>[] = [];
    try {
      usersRaw = await this.dataSource.query(
        `
      SELECT
        u.id AS "userId",
        u.email,
        sp."firstName",
        sp."lastName",
        sp.department,
        sp."ilccsNumber",
        sp."profilePicture",
        COALESCE(sp."employmentStatus"::text, 'ACTIVE') AS "employmentStatus",
        sp.start_date AS "startDate",
        u."lastLoginAt",
        u."createdAt",
        (COALESCE(sp."employmentStatus"::text, 'ACTIVE') = ANY($2::text[])) AS is_active,
        EXISTS (
          SELECT 1 FROM dbs_records d
          WHERE d."staffId" = sp.id
            AND d."renewalDate" IS NOT NULL
            AND d."renewalDate" <= CURRENT_DATE + ($1::int * INTERVAL '1 day')
            AND d."renewalDate" >= CURRENT_DATE
        ) AS dbs_expiring,
        EXISTS (
          SELECT 1 FROM dbs_records d
          WHERE d."staffId" = sp.id
            AND (
              (d."nextDeclarationDate" IS NOT NULL
                AND d."nextDeclarationDate" <= (CURRENT_DATE + ($3::int * INTERVAL '1 day')))
              OR (
                d."nextDeclarationDate" IS NULL
                AND COALESCE(d."lastDeclarationDate", d."issueDate") IS NOT NULL
                AND (COALESCE(d."lastDeclarationDate", d."issueDate") + INTERVAL '1 year')
                    <= (CURRENT_DATE + ($3::int * INTERVAL '1 day'))
              )
            )
        ) AS dbs_declaration_due,
        (sp."shareCode" IS NOT NULL
          AND TRIM(sp."shareCode") <> ''
          AND sp."visaExpiryDate" IS NOT NULL
          AND sp."visaExpiryDate" <= CURRENT_DATE + ($1::int * INTERVAL '1 day')
          AND sp."visaExpiryDate" >= CURRENT_DATE) AS share_code_expiring,
        (sp."visaExpiryDate" IS NOT NULL
          AND sp."visaExpiryDate" <= CURRENT_DATE + ($1::int * INTERVAL '1 day')
          AND sp."visaExpiryDate" >= CURRENT_DATE) AS visa_expiring,
        EXISTS (
          SELECT 1 FROM training_records tr
          WHERE tr."userId" = u.id AND tr.status = 'PENDING'
            AND (
              (tr."dueDate" IS NOT NULL AND tr."dueDate" <= CURRENT_DATE + INTERVAL '30 days')
              OR (tr."dueDate" IS NULL AND tr."enrollmentDate" < NOW() - INTERVAL '30 days')
            )
        ) AS training_due,
        (NOT EXISTS (
          SELECT 1 FROM review_forms rf
          WHERE rf."staffId" = sp.id AND rf."formType" = 'review'
            AND rf."dateOfReview" >= CURRENT_DATE - INTERVAL '90 days'
        ) AND COALESCE(sp.start_date, DATE(u."createdAt")) < CURRENT_DATE - INTERVAL '60 days') AS review_due,
        (NOT EXISTS (
          SELECT 1 FROM review_forms rf
          WHERE rf."staffId" = sp.id AND rf."formType" = 'supervision'
            AND rf."dateOfReview" >= CURRENT_DATE - INTERVAL '180 days'
        ) AND COALESCE(sp.start_date, DATE(u."createdAt")) < CURRENT_DATE - INTERVAL '90 days') AS supervision_due,
        (NOT EXISTS (
          SELECT 1 FROM review_forms rf
          WHERE rf."staffId" = sp.id AND rf."formType" = 'appraisal'
            AND rf."dateOfReview" >= CURRENT_DATE - INTERVAL '365 days'
        ) AND COALESCE(sp.start_date, DATE(u."createdAt")) < CURRENT_DATE - INTERVAL '365 days') AS appraisal_due
      FROM users u
      INNER JOIN staff_profiles sp ON sp."userId" = u.id
      WHERE u.role = 'STAFF'
      ORDER BY u."createdAt" DESC
      `,
        [expiryWarnDays, activeStatuses, declarationWarnDays],
      );
    } catch (err) {
      this.logger.error(
        'HR stats users query failed',
        err instanceof Error ? err.stack : err,
      );
      usersRaw = [];
    }

    const users = usersRaw.map((row: Record<string, unknown>) => {
      const employmentStatus = String(row.employmentStatus || 'ACTIVE');
      const employmentStatusBadge = employmentStatus;

      const filters: string[] = [];
      if (row.dbs_expiring) filters.push('dbs_expiring');
      if (row.dbs_declaration_due) filters.push('dbs_declaration_due');
      if (row.share_code_expiring) filters.push('share_code_expiring');
      if (row.visa_expiring) filters.push('visa_expiring');
      if (row.training_due) filters.push('training_due');
      if (row.review_due) filters.push('reviews_due');
      if (row.supervision_due) filters.push('supervisions_due');
      if (row.appraisal_due) filters.push('appraisals_due');
      if (employmentStatus === 'ON_SHADOW') {
        filters.push('on_shadow');
      }
      if (row.is_active) filters.push('active');
      else filters.push('inactive');
      if (row.startDate && new Date(String(row.startDate)) >= new Date(Date.now() - 90 * 86400000)) {
        filters.push('new_starters');
      }

      return {
        id: row.userId,
        fullName: [row.firstName, row.lastName].filter(Boolean).join(' ').trim() || row.firstName || 'Staff',
        email: row.email,
        role: row.department || 'Staff',
        status: row.is_active ? 'ACTIVE' : 'INACTIVE',
        employmentStatus,
        employmentStatusBadge,
        lastLoginAt: row.lastLoginAt,
        startDate: row.startDate,
        ilccsNumber: row.ilccsNumber,
        profilePicture: row.userId
          ? `/api/v1/staff/${row.userId}/profile-picture`
          : null,
        filters,
      };
    });

    const safeTotalUsers = Number.isFinite(totalUsers) ? totalUsers : users.length;
    const safeTotalActive = Number.isFinite(totalActive) ? totalActive : 0;
    return {
      totalActive: safeTotalActive,
      newStarters,
      staffOnShadow,
      dbsExpiringSoon,
      dbsDeclarationDue,
      shareCodeExpiring,
      visaExpiringSoon,
      trainingDue,
      reviewsDue,
      supervisionsDue,
      appraisalsDue,
      staffCompliancePercentage,
      totalUsers: safeTotalUsers,
      activeUsers: safeTotalActive,
      inactiveUsers: safeTotalUsers - safeTotalActive,
      users,
    };
  }

  /** Safe wrapper: never throws — returns empty stats on failure. */
  async getHrStatsSafe() {
    try {
      return await this.getHrStats();
    } catch (err) {
      this.logger.error(
        'getHrStats failed entirely',
        err instanceof Error ? err.stack : err,
      );
      return { ...EMPTY_HR_STATS };
    }
  }

  private periodStartDate(period: 'week' | 'month' | 'year'): Date {
    const now = new Date();
    if (period === 'week') {
      const d = new Date(now);
      const day = d.getDay();
      const diff = day === 0 ? 6 : day - 1;
      d.setDate(d.getDate() - diff);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    if (period === 'month') {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    return new Date(now.getFullYear(), 0, 1);
  }

  private async queryStaffComplianceRows(): Promise<Array<Record<string, unknown>>> {
    return this.dataSource.query(`
      WITH staff_base AS (
        SELECT
          u.id AS "userId",
          sp.id AS "staffProfileId",
          sp."firstName",
          sp."lastName",
          sp."lastName" AS "lastNameSort",
          COALESCE(sp."lcaNumber", sp."ilccsNumber", '-') AS lcacs,
          COALESCE(sp."employmentStatus"::text, 'ACTIVE') AS "employmentStatus",
          sp.start_date::text AS "startDate",
          u."createdAt"::date::text AS "createdAtDate",
          sp."visaExpiryDate" AS "visaExpiryDate"
        FROM users u
        INNER JOIN staff_profiles sp ON sp."userId" = u.id
        WHERE u.role = 'STAFF'
      )
      SELECT
        sb.*,
        EXISTS (
          SELECT 1 FROM dbs_records d
          WHERE d."staffId" = sb."staffProfileId"
            AND (d."renewalDate" IS NULL OR d."renewalDate" >= CURRENT_DATE)
        ) AS dbs_ok,
        (
          SELECT MIN(d."renewalDate")
          FROM dbs_records d
          WHERE d."staffId" = sb."staffProfileId"
            AND d."renewalDate" IS NOT NULL
        )::text AS dbs_renewal_date,
        (sb."visaExpiryDate" IS NULL OR sb."visaExpiryDate"::date >= CURRENT_DATE) AS visa_ok,
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
          WHERE r."staffId" = sb."staffProfileId"
            AND r.status IN ('submitted', 'completed')
        ) >= 2 AS references_ok,
        EXISTS (
          SELECT 1 FROM policy_reading_sessions prs
          WHERE prs."staffId" = sb."staffProfileId"
            AND prs.status = 'COMPLETED'
            AND prs."endTime" >= NOW() - INTERVAL '90 days'
        ) AS policies_ok,
        (
          SELECT MAX(rf."dateOfReview")
          FROM review_forms rf
          WHERE rf."staffId" = sb."staffProfileId"
            AND rf."formType" = 'supervision'
        )::text AS last_supervision,
        (
          SELECT MAX(rf."dateOfReview")
          FROM review_forms rf
          WHERE rf."staffId" = sb."staffProfileId"
            AND rf."formType" = 'appraisal'
        )::text AS last_appraisal
      FROM staff_base sb
      ORDER BY sb."lastNameSort" NULLS LAST, sb."firstName" NULLS LAST
    `);
  }

  private mapStaffAnalyticsRow(r: Record<string, unknown>) {
    const failed: string[] = [];
    if (!r.dbs_ok) failed.push('DBS');
    if (!r.visa_ok) failed.push('Visa');
    if (!r.training_ok) failed.push('Training');
    if (!r.references_ok) failed.push('References');
    if (!r.policies_ok) failed.push('Policies');

    const complianceStatus =
      failed.length === 0 ? 'green' : failed.length <= 2 ? 'amber' : 'red';

    return {
      userId: String(r.userId || ''),
      staffProfileId: String(r.staffProfileId || ''),
      name: [r.firstName, r.lastName].filter(Boolean).join(' ').trim() || r.firstName || 'Staff',
      lcacs: String(r.lcacs || '-'),
      employmentStatus: String(r.employmentStatus || 'ACTIVE'),
      startDate: r.startDate ? String(r.startDate) : null,
      dbsStatus: r.dbs_ok ? 'Compliant' : 'Due / Expired',
      dbsCompliant: Boolean(r.dbs_ok),
      dbsRenewalDate: r.dbs_renewal_date ? String(r.dbs_renewal_date) : null,
      visaExpiryDate: r.visaExpiryDate
        ? String(r.visaExpiryDate).slice(0, 10)
        : null,
      visaCompliant: Boolean(r.visa_ok),
      trainingStatus: r.training_ok ? 'Compliant' : 'Training Due',
      trainingCompliant: Boolean(r.training_ok),
      referencesCompliant: Boolean(r.references_ok),
      policiesCompliant: Boolean(r.policies_ok),
      lastSupervision: r.last_supervision ? String(r.last_supervision) : null,
      lastAppraisal: r.last_appraisal ? String(r.last_appraisal) : null,
      complianceStatus,
      complianceFailedChecks: failed,
    };
  }

  private buildComplianceBreakdown(rows: Array<Record<string, unknown>>) {
    const categories = [
      { key: 'dbs_ok', label: 'DBS' },
      { key: 'visa_ok', label: 'Visa' },
      { key: 'training_ok', label: 'Training' },
      { key: 'references_ok', label: 'References' },
      { key: 'policies_ok', label: 'Policies' },
    ] as const;

    return categories.map((c) => {
      let compliant = 0;
      let nonCompliant = 0;
      rows.forEach((r) => {
        if (Boolean(r[c.key])) compliant += 1;
        else nonCompliant += 1;
      });
      return { label: c.label, compliant, nonCompliant };
    });
  }

  private async queryEmploymentStatusBreakdown() {
    const rows: Array<{ status: string; count: number }> = await this.dataSource.query(`
      SELECT COALESCE(sp."employmentStatus"::text, 'ACTIVE') AS status,
             COUNT(*)::int AS count
      FROM users u
      INNER JOIN staff_profiles sp ON sp."userId" = u.id
      WHERE u.role = 'STAFF'
      GROUP BY COALESCE(sp."employmentStatus"::text, 'ACTIVE')
      ORDER BY count DESC
    `);

    const labelMap: Record<string, string> = {
      ACTIVE: 'Active',
      ON_SHADOW: 'On Shadow',
      APPLICANT: 'Applicant',
      LEAVER: 'Leaver',
    };
    const colorMap: Record<string, string> = {
      ACTIVE: '#139639',
      ON_SHADOW: '#267FBA',
      APPLICANT: '#F59F00',
      LEAVER: '#E03131',
    };

    return rows.map((r) => ({
      status: r.status,
      label: labelMap[r.status] || r.status,
      count: Number(r.count) || 0,
      color: colorMap[r.status] || '#868e96',
    }));
  }

  private async queryNewStartersOverTime(periodStart: Date) {
    const rows: Array<{ month: string; count: number }> = await this.dataSource.query(
      `
      SELECT to_char(date_trunc('month', COALESCE(sp.start_date, DATE(u."createdAt"))), 'YYYY-MM') AS month,
             COUNT(*)::int AS count
      FROM users u
      INNER JOIN staff_profiles sp ON sp."userId" = u.id
      WHERE u.role = 'STAFF'
        AND COALESCE(sp.start_date, DATE(u."createdAt")) >= $1::date
      GROUP BY 1
      ORDER BY 1 ASC
      `,
      [periodStart.toISOString().slice(0, 10)],
    );

    const buckets: Array<{ month: string; label: string; count: number }> = [];
    const now = new Date();
    const cursor = new Date(periodStart.getFullYear(), periodStart.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    const countByMonth = new Map(rows.map((r) => [r.month, Number(r.count) || 0]));

    while (cursor <= end) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      buckets.push({
        month: key,
        label: cursor.toLocaleString('en-GB', { month: 'short', year: '2-digit' }),
        count: countByMonth.get(key) ?? 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return buckets;
  }

  private isWithinPeriod(
    startDate: string | null | undefined,
    createdAtDate: string | null | undefined,
    periodStart: Date,
  ): boolean {
    const raw = startDate || createdAtDate;
    if (!raw) return false;
    const value = new Date(String(raw));
    if (Number.isNaN(value.getTime())) return false;
    return value >= periodStart;
  }

  async getAnalyticsData(period: 'week' | 'month' | 'year' = 'month') {
    const periodStart = this.periodStartDate(period);
    const rows = await this.queryStaffComplianceRows();
    const hrStats = await this.getHrStatsSafe();

    const allStaff = rows.map((r) => this.mapStaffAnalyticsRow(r));
    const staffInPeriod = rows
      .filter((r) =>
        this.isWithinPeriod(
          r.startDate ? String(r.startDate) : null,
          r.createdAtDate ? String(r.createdAtDate) : null,
          periodStart,
        ),
      )
      .map((r) => this.mapStaffAnalyticsRow(r));

    const fullyCompliant = rows.filter(
      (r) =>
        Boolean(r.dbs_ok) &&
        Boolean(r.visa_ok) &&
        Boolean(r.training_ok) &&
        Boolean(r.references_ok) &&
        Boolean(r.policies_ok),
    ).length;

    const employmentStatusBreakdown = await this.queryEmploymentStatusBreakdown();
    const complianceBreakdown = this.buildComplianceBreakdown(rows);
    const newStartersOverTime = await this.queryNewStartersOverTime(periodStart);

    const totalStaff = rows.length;

    return {
      staff: staffInPeriod,
      period,
      employmentStatusBreakdown,
      complianceBreakdown,
      newStartersOverTime,
      overallCompliance: {
        percentage: hrStats.staffCompliancePercentage ?? 0,
        fullyCompliant,
        totalStaff,
      },
    };
  }
}
