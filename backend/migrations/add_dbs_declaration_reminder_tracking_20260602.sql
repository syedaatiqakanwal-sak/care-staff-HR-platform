ALTER TABLE dbs_records
  ADD COLUMN IF NOT EXISTS "lastDeclarationReminderSentAt" TIMESTAMP;
