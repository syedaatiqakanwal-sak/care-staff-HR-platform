ALTER TABLE staff_profiles
  ADD COLUMN IF NOT EXISTS start_date DATE;

UPDATE staff_profiles sp
SET start_date = DATE(u."createdAt")
FROM users u
WHERE sp."userId" = u.id
  AND sp.start_date IS NULL;

ALTER TABLE dbs_records
  ADD COLUMN IF NOT EXISTS "lastDeclarationDate" DATE;
