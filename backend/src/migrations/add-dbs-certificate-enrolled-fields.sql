ALTER TABLE dbs_records
  ADD COLUMN IF NOT EXISTS "dbsCertificateNumber" varchar,
  ADD COLUMN IF NOT EXISTS "enrolledDate" varchar;
