-- Indexes to support HR dashboard aggregate queries (additive)
CREATE INDEX IF NOT EXISTS idx_users_role_created ON users(role, "createdAt");
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users("lastLoginAt");
CREATE INDEX IF NOT EXISTS idx_staff_profiles_employment ON staff_profiles("employmentStatus");
CREATE INDEX IF NOT EXISTS idx_staff_profiles_visa_expiry ON staff_profiles("visaExpiryDate") WHERE "visaExpiryDate" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dbs_records_renewal ON dbs_records("renewalDate") WHERE "renewalDate" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_training_records_status_due ON training_records(status, "dueDate");
CREATE INDEX IF NOT EXISTS idx_review_forms_type_date ON review_forms("formType", "dateOfReview");
CREATE INDEX IF NOT EXISTS idx_references_staff_status ON references("staffId", status);
CREATE INDEX IF NOT EXISTS idx_policy_sessions_staff_status ON policy_reading_sessions("staffId", status);
