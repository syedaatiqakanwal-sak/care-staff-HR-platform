-- Safer recruitment checklist per staff profile
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
