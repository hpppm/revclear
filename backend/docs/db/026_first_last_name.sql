-- Migration 026: Add first_name and last_name columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Backfill from full_name by splitting on the first space.
-- Skips sentinel values ('Unknown', 'Unknown User') and NULL/empty.
UPDATE users
SET
  first_name = NULLIF(split_part(TRIM(full_name), ' ', 1), ''),
  last_name   = NULLIF(
    TRIM(substring(full_name FROM position(' ' IN full_name) + 1)),
    ''
  )
WHERE
  full_name IS NOT NULL
  AND TRIM(full_name) != ''
  AND TRIM(full_name) NOT IN ('Unknown', 'Unknown User');
