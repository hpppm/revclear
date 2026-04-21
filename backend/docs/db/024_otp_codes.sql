-- Migration 024: otp_codes table for email OTP verification step
-- OTP codes are stored hashed (SHA-256). Plain codes are never persisted.
-- Rows are marked used=true on consumption and cleaned up passively on verify.

CREATE TABLE IF NOT EXISTS otp_codes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email   VARCHAR(255) NOT NULL,
  code         VARCHAR(64)  NOT NULL,
  expires_at   TIMESTAMP    NOT NULL,
  used         BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS otp_codes_email_idx      ON otp_codes(user_email);
CREATE INDEX IF NOT EXISTS otp_codes_expires_at_idx ON otp_codes(expires_at);
