DO $$ BEGIN
  CREATE TYPE hr_case_note_category_enum AS ENUM (
    'POSITIVE_FEEDBACK',
    'COMPLAINT',
    'INVESTIGATION',
    'DISCIPLINARY',
    'GRIEVANCE',
    'RETURN_TO_WORK',
    'SICKNESS',
    'CONDUCT',
    'SAFEGUARDING'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
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
CREATE INDEX IF NOT EXISTS idx_hr_case_notes_category ON hr_case_notes(category);
