-- HR Feedback Round 3: address gap tracking, address proof, immigration / RTW fields

ALTER TABLE IF EXISTS staff_profiles
  ADD COLUMN IF NOT EXISTS address_gap_notified_at TIMESTAMP;

ALTER TABLE IF EXISTS staff_profiles
  ADD COLUMN IF NOT EXISTS share_code_generated_date DATE;

ALTER TABLE IF EXISTS staff_profiles
  ADD COLUMN IF NOT EXISTS right_to_work_check_completed BOOLEAN DEFAULT FALSE;

ALTER TABLE IF EXISTS staff_profiles
  ADD COLUMN IF NOT EXISTS right_to_work_check_date DATE;

ALTER TABLE IF EXISTS staff_profiles
  ADD COLUMN IF NOT EXISTS right_to_work_check_expiry_date DATE;

ALTER TABLE IF EXISTS address_history
  ADD COLUMN IF NOT EXISTS proof_document_id UUID;
