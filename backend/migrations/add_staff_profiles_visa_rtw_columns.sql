-- Right-to-work / visa tracking (additive; safe to re-run)
ALTER TABLE IF EXISTS staff_profiles
  ADD COLUMN IF NOT EXISTS "visaExpiryDate" DATE;

ALTER TABLE IF EXISTS staff_profiles
  ADD COLUMN IF NOT EXISTS "shareCode" VARCHAR(64);

ALTER TABLE IF EXISTS staff_profiles
  ADD COLUMN IF NOT EXISTS "rightToWorkStatus" VARCHAR(120);
