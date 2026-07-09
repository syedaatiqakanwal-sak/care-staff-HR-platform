-- DBS check records per staff member
CREATE TABLE IF NOT EXISTS dbs_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "staffId" UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  "dbsNumber" VARCHAR(64) NOT NULL,
  "issueDate" DATE,
  "renewalDate" DATE,
  "updateServiceStatus" BOOLEAN NOT NULL DEFAULT false,
  "certificateDocumentId" UUID REFERENCES staff_documents(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dbs_records_staff_unique ON dbs_records("staffId");
CREATE INDEX IF NOT EXISTS idx_dbs_records_renewal ON dbs_records("renewalDate") WHERE "renewalDate" IS NOT NULL;
