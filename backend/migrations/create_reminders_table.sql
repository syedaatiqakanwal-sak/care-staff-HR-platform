-- Migration: Create reminders table
-- Note: user_id is UUID (not INTEGER) to match the users table structure

CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50),
  message TEXT,
  scheduled_at TIMESTAMP NOT NULL,
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_pending 
ON reminders(scheduled_at) WHERE sent = FALSE;

CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(user_id);
