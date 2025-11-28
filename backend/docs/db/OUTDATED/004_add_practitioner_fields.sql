-- Migration: Add practitioner_type and license_id to users table
-- This migration adds fields to store practitioner information from signup

BEGIN;

-- Add practitioner_type column
ALTER TABLE users
ADD COLUMN practitioner_type TEXT;

-- Add license_id column  
ALTER TABLE users
ADD COLUMN license_id TEXT;

-- Add comment for documentation
COMMENT ON COLUMN users.practitioner_type IS 'Type of practitioner: Mental Health, Speech Therapy, Physical Therapy, etc.';
COMMENT ON COLUMN users.license_id IS 'Professional license or certification ID';

COMMIT;
