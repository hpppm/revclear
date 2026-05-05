-- Migration 027: Daily AI usage quota tracking per user
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS ai_usage_quotas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ai_type      TEXT NOT NULL,   -- 'transcribe' | 'soap' | 'codes'
  usage_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  call_count   INTEGER NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, ai_type, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_quotas_user_date
  ON ai_usage_quotas (user_id, usage_date);
