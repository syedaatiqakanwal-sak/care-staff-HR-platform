-- Audit trail (Phase 5+ / Phase 8) — append-only activity log
CREATE TABLE IF NOT EXISTS audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "actorUserId" UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action VARCHAR(64) NOT NULL,
  "resourceType" VARCHAR(64) NOT NULL,
  "resourceId" UUID,
  "staffProfileId" UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  metadata JSONB,
  "ipAddress" VARCHAR(45),
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_trail_actor ON audit_trail("actorUserId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_resource ON audit_trail("resourceType", "resourceId");
CREATE INDEX IF NOT EXISTS idx_audit_trail_staff ON audit_trail("staffProfileId", "createdAt" DESC);
