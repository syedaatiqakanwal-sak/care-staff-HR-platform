-- Annual leave entitlement (days per calendar year). Balance is computed from approved ANNUAL leave_records.
ALTER TABLE staff_profiles
  ADD COLUMN IF NOT EXISTS "annualLeaveAllowanceDays" INTEGER NOT NULL DEFAULT 28;
