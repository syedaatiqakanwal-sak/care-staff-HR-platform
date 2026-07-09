-- Fix missing HR expansion schema on live DB (idempotent; safe to re-run)
-- Matches TypeORM entities: staff_profiles, staff_documents, dbs_records, recruitment_records, etc.

-- ---------------------------------------------------------------------------
-- staff_profiles: columns required by StaffProfile entity + hr-stats queries
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS staff_profiles
  ADD COLUMN IF NOT EXISTS "visaExpiryDate" DATE;

ALTER TABLE IF EXISTS staff_profiles
  ADD COLUMN IF NOT EXISTS "shareCode" VARCHAR(64);

ALTER TABLE IF EXISTS staff_profiles
  ADD COLUMN IF NOT EXISTS "rightToWorkStatus" VARCHAR(120);

ALTER TABLE IF EXISTS staff_profiles
  ADD COLUMN IF NOT EXISTS "annualLeaveAllowanceDays" INTEGER NOT NULL DEFAULT 28;

-- Birth / nationality (entity uses camelCase column names)
ALTER TABLE IF EXISTS staff_profiles
  ADD COLUMN IF NOT EXISTS "townOfBirth" VARCHAR;

ALTER TABLE IF EXISTS staff_profiles
  ADD COLUMN IF NOT EXISTS "countyOfBirth" VARCHAR;

ALTER TABLE IF EXISTS staff_profiles
  ADD COLUMN IF NOT EXISTS "nationalityAtBirth" VARCHAR;

ALTER TABLE IF EXISTS staff_profiles
  ADD COLUMN IF NOT EXISTS "currentNationality" VARCHAR;

ALTER TABLE IF EXISTS staff_profiles
  ADD COLUMN IF NOT EXISTS "ni_number" VARCHAR(13);

-- Employment status enum (optional upgrade from varchar)
DO $$ BEGIN
  CREATE TYPE staff_employment_status_enum AS ENUM ('APPLICANT', 'ON_SHADOW', 'ACTIVE', 'LEAVER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'staff_profiles'
      AND column_name = 'employmentStatus'
      AND udt_name <> 'staff_employment_status_enum'
  ) THEN
    ALTER TABLE staff_profiles ALTER COLUMN "employmentStatus" DROP DEFAULT;
    ALTER TABLE staff_profiles
      ALTER COLUMN "employmentStatus" TYPE staff_employment_status_enum
      USING (
        CASE
          WHEN "employmentStatus" IS NULL THEN 'ACTIVE'::staff_employment_status_enum
          WHEN UPPER(TRIM("employmentStatus"::text)) IN ('LEFT', 'LEAVER') THEN 'LEAVER'::staff_employment_status_enum
          WHEN UPPER(TRIM("employmentStatus"::text)) IN ('ON_SHADOW', 'ON SHADOW') THEN 'ON_SHADOW'::staff_employment_status_enum
          WHEN UPPER(TRIM("employmentStatus"::text)) = 'APPLICANT' THEN 'APPLICANT'::staff_employment_status_enum
          ELSE 'ACTIVE'::staff_employment_status_enum
        END
      );
    ALTER TABLE staff_profiles
      ALTER COLUMN "employmentStatus" SET DEFAULT 'ACTIVE'::staff_employment_status_enum;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- users: readOnly (JWT / login)
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS "readOnly" BOOLEAN NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- staff_documents (before dbs_records FK)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "staffId" UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  "documentType" VARCHAR(40) NOT NULL,
  "fileName" VARCHAR(512) NOT NULL,
  "filePath" VARCHAR(1024) NOT NULL,
  "issueDate" DATE,
  "expiryDate" DATE,
  notes TEXT,
  "uploadedBy" UUID REFERENCES users(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_documents_staff ON staff_documents("staffId");
CREATE INDEX IF NOT EXISTS idx_staff_documents_expiry ON staff_documents("expiryDate") WHERE "expiryDate" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_documents_type ON staff_documents("documentType");

-- ---------------------------------------------------------------------------
-- dbs_records (hr-stats compliance queries)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dbs_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "staffId" UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  "dbsNumber" VARCHAR(64) NOT NULL,
  "issueDate" DATE,
  "renewalDate" DATE,
  "updateServiceStatus" BOOLEAN NOT NULL DEFAULT false,
  "certificateDocumentId" UUID REFERENCES staff_documents(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dbs_records_staff_unique ON dbs_records("staffId");
CREATE INDEX IF NOT EXISTS idx_dbs_records_renewal ON dbs_records("renewalDate") WHERE "renewalDate" IS NOT NULL;

-- ---------------------------------------------------------------------------
-- recruitment_records
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recruitment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "staffId" UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  "interviewRecorded" BOOLEAN NOT NULL DEFAULT false,
  "interviewRecordedDate" DATE,
  "offerLetterIssued" BOOLEAN NOT NULL DEFAULT false,
  "offerLetterIssuedDate" DATE,
  "contractIssued" BOOLEAN NOT NULL DEFAULT false,
  "contractIssuedDate" DATE,
  "contractSigned" BOOLEAN NOT NULL DEFAULT false,
  "contractSignedDate" DATE,
  "inductionCompleted" BOOLEAN NOT NULL DEFAULT false,
  "inductionCompletedDate" DATE,
  "shadowStarted" BOOLEAN NOT NULL DEFAULT false,
  "shadowStartDate" DATE,
  "shadowEndDate" DATE,
  notes TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_recruitment_records_staff_unique ON recruitment_records("staffId");

-- ---------------------------------------------------------------------------
-- HR case notes, leave, attendance, payroll
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE hr_case_note_category_enum AS ENUM (
    'POSITIVE_FEEDBACK', 'COMPLAINT', 'INVESTIGATION', 'DISCIPLINARY',
    'GRIEVANCE', 'RETURN_TO_WORK', 'SICKNESS', 'CONDUCT', 'SAFEGUARDING'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS hr_case_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "staffId" UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  category hr_case_note_category_enum NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  confidential BOOLEAN NOT NULL DEFAULT true,
  "createdBy" UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_case_notes_staff ON hr_case_notes("staffId", "createdAt" DESC);

DO $$ BEGIN
  CREATE TYPE leave_type_enum AS ENUM ('ANNUAL', 'SICK', 'UNPAID', 'EMERGENCY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE leave_status_enum AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS leave_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "staffId" UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  "leaveType" leave_type_enum NOT NULL,
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  status leave_status_enum NOT NULL DEFAULT 'REQUESTED',
  reason TEXT,
  "approvedBy" UUID REFERENCES users(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT leave_records_dates_check CHECK ("endDate" >= "startDate")
);

CREATE INDEX IF NOT EXISTS idx_leave_records_staff ON leave_records("staffId", "startDate" DESC);

DO $$ BEGIN
  CREATE TYPE attendance_status_enum AS ENUM ('PRESENT', 'LATE', 'NO_SHOW', 'ABSENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "staffId" UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status attendance_status_enum NOT NULL DEFAULT 'PRESENT',
  notes TEXT,
  "returnToWorkCompleted" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT attendance_records_staff_date_unique UNIQUE ("staffId", date)
);

DO $$ BEGIN
  CREATE TYPE pay_type_enum AS ENUM ('SALARY', 'HOURLY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS payroll_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "staffId" UUID NOT NULL UNIQUE REFERENCES staff_profiles(id) ON DELETE CASCADE,
  "salaryOrRate" VARCHAR(64),
  "payType" pay_type_enum,
  "contractType" VARCHAR(120),
  "pensionStatus" VARCHAR(120),
  "bankDetailsEncrypted" TEXT,
  "payrollNotes" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'audit_trail'
  ) THEN
    ALTER TABLE audit_trail RENAME TO audit_logs;
    ALTER TABLE audit_logs RENAME COLUMN "actorUserId" TO "userId";
    ALTER TABLE audit_logs RENAME COLUMN "resourceType" TO "entityType";
    ALTER TABLE audit_logs RENAME COLUMN "resourceId" TO "entityId";
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS "userRole" VARCHAR(32);
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS summary TEXT;
    ALTER TABLE audit_logs DROP COLUMN IF EXISTS "staffProfileId";
    ALTER TABLE audit_logs DROP COLUMN IF EXISTS metadata;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'audit_logs'
  ) THEN
    CREATE TABLE audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "userId" UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      "userRole" VARCHAR(32),
      action VARCHAR(64) NOT NULL,
      "entityType" VARCHAR(64) NOT NULL,
      "entityId" UUID,
      summary TEXT,
      "ipAddress" VARCHAR(45),
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs("entityType", "entityId");
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs("createdAt" DESC);

-- ---------------------------------------------------------------------------
-- HR dashboard performance indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_role_created ON users(role, "createdAt");
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users("lastLoginAt");
CREATE INDEX IF NOT EXISTS idx_staff_profiles_employment ON staff_profiles("employmentStatus");
CREATE INDEX IF NOT EXISTS idx_staff_profiles_visa_expiry ON staff_profiles("visaExpiryDate") WHERE "visaExpiryDate" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_training_records_status_due ON training_records(status, "dueDate");
CREATE INDEX IF NOT EXISTS idx_review_forms_type_date ON review_forms("formType", "dateOfReview");
CREATE INDEX IF NOT EXISTS idx_references_staff_status ON "references"("staffId", status);
CREATE INDEX IF NOT EXISTS idx_policy_sessions_staff_status ON policy_reading_sessions("staffId", status);

-- Management roles on users.role enum
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_role_enum') THEN
    ALTER TYPE users_role_enum ADD VALUE IF NOT EXISTS 'MANAGER';
    ALTER TYPE users_role_enum ADD VALUE IF NOT EXISTS 'HR';
    ALTER TYPE users_role_enum ADD VALUE IF NOT EXISTS 'SUPERVISOR';
  END IF;
END $$;
