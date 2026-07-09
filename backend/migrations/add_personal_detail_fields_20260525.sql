-- Staff profile fields: client feedback round 1 (additive; safe to re-run)
-- Existing columns NOT re-added: middleName, dateOfBirth, ni_number, visaExpiryDate, shareCode

ALTER TABLE staff_profiles
  ADD COLUMN IF NOT EXISTS gender VARCHAR(30);

ALTER TABLE staff_profiles
  ADD COLUMN IF NOT EXISTS "nextOfKinName" VARCHAR(100);

ALTER TABLE staff_profiles
  ADD COLUMN IF NOT EXISTS "nextOfKinNumber" VARCHAR(30);

ALTER TABLE staff_profiles
  ADD COLUMN IF NOT EXISTS "passportNumber" VARCHAR(50);

ALTER TABLE staff_profiles
  ADD COLUMN IF NOT EXISTS "passportExpiry" DATE;

ALTER TABLE staff_profiles
  ADD COLUMN IF NOT EXISTS "isUkNational" BOOLEAN;

ALTER TABLE staff_profiles
  ADD COLUMN IF NOT EXISTS "isEeaNational" BOOLEAN;

ALTER TABLE staff_profiles
  ADD COLUMN IF NOT EXISTS "visaType" VARCHAR(100);

ALTER TABLE staff_profiles
  ADD COLUMN IF NOT EXISTS "visaOrBrpNumber" VARCHAR(100);
