ALTER TABLE dbs_records
  ADD COLUMN IF NOT EXISTS "dateForNextChecking" varchar,
  ADD COLUMN IF NOT EXISTS "nextCheckDueDate" varchar;
