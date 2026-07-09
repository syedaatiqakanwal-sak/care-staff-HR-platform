-- Read-only flag: users may GET but not mutate data (enforced by ReadOnlyGuard)
ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS "readOnly" boolean NOT NULL DEFAULT false;
