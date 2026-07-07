-- Migration: Create plans table
-- Note: user_id is UUID (not INTEGER) to match the users table structure

CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_type VARCHAR(100) NOT NULL,
  start_date TIMESTAMP NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plans_user ON plans(user_id);
