-- Migration: Create api_tokens table
-- Note: user_id is UUID (not INTEGER) to match the users table structure

CREATE TABLE IF NOT EXISTS api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  scopes TEXT[] DEFAULT '{}',
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_tokens_hash ON api_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_api_tokens_user ON api_tokens(user_id);
