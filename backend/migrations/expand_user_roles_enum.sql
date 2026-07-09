-- Expand users.role enum for HR platform RBAC (additive; safe to re-run)
-- TypeORM default enum name for users.role is typically users_role_enum

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_role_enum') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'users_role_enum' AND e.enumlabel = 'MANAGER'
    ) THEN
      ALTER TYPE users_role_enum ADD VALUE IF NOT EXISTS 'MANAGER';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'users_role_enum' AND e.enumlabel = 'HR'
    ) THEN
      ALTER TYPE users_role_enum ADD VALUE IF NOT EXISTS 'HR';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'users_role_enum' AND e.enumlabel = 'SUPERVISOR'
    ) THEN
      ALTER TYPE users_role_enum ADD VALUE IF NOT EXISTS 'SUPERVISOR';
    END IF;
  ELSE
    RAISE NOTICE 'users_role_enum not found; confirm your DB enum name matches TypeORM schema';
  END IF;
END $$;
