DO $$ BEGIN
  CREATE TYPE leave_type_enum AS ENUM ('ANNUAL', 'SICK', 'UNPAID', 'EMERGENCY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE leave_status_enum AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
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
CREATE INDEX IF NOT EXISTS idx_leave_records_status ON leave_records(status) WHERE status = 'REQUESTED';
