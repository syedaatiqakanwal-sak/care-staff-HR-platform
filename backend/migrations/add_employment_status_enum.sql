-- Safer recruitment employment status (additive: maps legacy string values to enum)
DO $$ BEGIN
  CREATE TYPE staff_employment_status_enum AS ENUM ('APPLICANT', 'ON_SHADOW', 'ACTIVE', 'LEAVER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE staff_profiles
  ALTER COLUMN "employmentStatus" DROP DEFAULT;

ALTER TABLE staff_profiles
  ALTER COLUMN "employmentStatus" TYPE staff_employment_status_enum
  USING (
    CASE
      WHEN "employmentStatus" IS NULL THEN 'ACTIVE'::staff_employment_status_enum
      WHEN UPPER(TRIM("employmentStatus"::text)) IN ('LEFT', 'LEAVER') THEN 'LEAVER'::staff_employment_status_enum
      WHEN UPPER(TRIM("employmentStatus"::text)) IN ('ON_SHADOW', 'ON SHADOW') THEN 'ON_SHADOW'::staff_employment_status_enum
      WHEN UPPER(TRIM("employmentStatus"::text)) = 'APPLICANT' THEN 'APPLICANT'::staff_employment_status_enum
      ELSE 'ACTIVE'::staff_employment_status_enum
    END
  );

ALTER TABLE staff_profiles
  ALTER COLUMN "employmentStatus" SET DEFAULT 'ACTIVE'::staff_employment_status_enum;
