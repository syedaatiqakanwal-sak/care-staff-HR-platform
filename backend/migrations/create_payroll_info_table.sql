DO $$ BEGIN
  CREATE TYPE pay_type_enum AS ENUM ('SALARY', 'HOURLY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_payroll_info_staff_unique ON payroll_info("staffId");
