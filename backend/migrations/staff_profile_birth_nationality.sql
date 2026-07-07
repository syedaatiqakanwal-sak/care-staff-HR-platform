-- Adds persisted fields for Identity & Address > Birth & Nationality (matches TypeORM camelCase columns).
-- Run once on the application database. If a column already exists, skip that line or comment it out.

ALTER TABLE staff_profiles ADD COLUMN "townOfBirth" character varying;
ALTER TABLE staff_profiles ADD COLUMN "countyOfBirth" character varying;
ALTER TABLE staff_profiles ADD COLUMN "nationalityAtBirth" character varying;
ALTER TABLE staff_profiles ADD COLUMN "currentNationality" character varying;
