-- Ensure unique constraint for concurrent attendance upserts (idempotent)
DO $$ BEGIN
  ALTER TABLE attendance_records
    ADD CONSTRAINT attendance_records_staff_date_unique UNIQUE ("staffId", date);
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN unique_violation THEN
    -- Clean duplicates keeping newest row, then add constraint
    DELETE FROM attendance_records a
    USING attendance_records b
    WHERE a."staffId" = b."staffId"
      AND a.date = b.date
      AND a."createdAt" < b."createdAt";
    ALTER TABLE attendance_records
      ADD CONSTRAINT attendance_records_staff_date_unique UNIQUE ("staffId", date);
END $$;
