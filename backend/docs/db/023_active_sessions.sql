-- Migration 023: active_sessions table for concurrent session limiting
-- Each row represents one live session (one login on one device).
-- On login: insert new row, delete all previous rows for that user.
-- On every request: verify jti exists for that user.
-- On logout: delete row by jti.

CREATE TABLE IF NOT EXISTS active_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  jti           TEXT NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS active_sessions_user_id_idx ON active_sessions(user_id);
CREATE INDEX IF NOT EXISTS active_sessions_jti_idx ON active_sessions(jti);
