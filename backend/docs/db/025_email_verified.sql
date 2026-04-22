-- Migration 025: add email_verified to users table
-- Tracks whether a user has confirmed their email address via OTP.
-- Default FALSE so existing rows are unverified until they sign in again.

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS users_email_verified_idx ON users(email_verified);
