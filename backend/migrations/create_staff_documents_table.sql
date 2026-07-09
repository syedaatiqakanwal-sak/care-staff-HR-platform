-- Staff compliance documents (identity, RTW, HMRC, contracts, etc.)
CREATE TABLE IF NOT EXISTS staff_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "staffId" UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  "documentType" VARCHAR(40) NOT NULL,
  "fileName" VARCHAR(512) NOT NULL,
  "filePath" VARCHAR(1024) NOT NULL,
  "issueDate" DATE,
  "expiryDate" DATE,
  notes TEXT,
  "uploadedBy" UUID REFERENCES users(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_documents_staff ON staff_documents("staffId");
CREATE INDEX IF NOT EXISTS idx_staff_documents_expiry ON staff_documents("expiryDate") WHERE "expiryDate" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_documents_type ON staff_documents("documentType");
