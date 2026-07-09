DO $$ BEGIN
  CREATE TYPE attendance_status_enum AS ENUM ('PRESENT', 'LATE', 'NO_SHOW', 'ABSENT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
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

CREATE INDEX IF NOT EXISTS idx_attendance_records_staff_date ON attendance_records("staffId", date DESC);
