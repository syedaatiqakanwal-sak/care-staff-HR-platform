-- Phase 8: consolidate audit_trail -> audit_logs (who-changed-what log)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'audit_trail'
  ) THEN
    ALTER TABLE audit_trail RENAME TO audit_logs;
    ALTER TABLE audit_logs RENAME COLUMN "actorUserId" TO "userId";
    ALTER TABLE audit_logs RENAME COLUMN "resourceType" TO "entityType";
    ALTER TABLE audit_logs RENAME COLUMN "resourceId" TO "entityId";
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS "userRole" VARCHAR(32);
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS summary TEXT;
    UPDATE audit_logs
    SET summary = COALESCE(summary, metadata::text, action)
    WHERE summary IS NULL;
    ALTER TABLE audit_logs DROP COLUMN IF EXISTS "staffProfileId";
    ALTER TABLE audit_logs DROP COLUMN IF EXISTS metadata;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'audit_logs'
  ) THEN
    CREATE TABLE audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "userId" UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      "userRole" VARCHAR(32),
      action VARCHAR(64) NOT NULL,
      "entityType" VARCHAR(64) NOT NULL,
      "entityId" UUID,
      summary TEXT,
      "ipAddress" VARCHAR(45),
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs("entityType", "entityId");
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs("userId", "createdAt" DESC);
