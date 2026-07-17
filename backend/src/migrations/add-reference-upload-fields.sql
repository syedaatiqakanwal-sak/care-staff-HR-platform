ALTER TABLE "references"
  ADD COLUMN IF NOT EXISTS "uploadedFilePath" varchar,
  ADD COLUMN IF NOT EXISTS "uploadedFileName" varchar;
