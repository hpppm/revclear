-- 1. Start a transaction block (Safety net)
BEGIN;

-- 2. Enable the extension if it doesn't exist (Required for gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 3. Add the column (Initially nullable)
-- Note: We add the UNIQUE constraint now. Since all values are NULL initially, this passes.
ALTER TABLE users
ADD COLUMN cognito_id TEXT UNIQUE;

-- 4. Backfill existing rows with placeholders
-- Casting ::text ensures the UUID type fits into your TEXT column safely
UPDATE users
SET cognito_id = gen_random_uuid()::text
WHERE cognito_id IS NULL;

-- 5. Enforce the NOT NULL constraint
-- This will check that step 4 worked for every single row
ALTER TABLE users
ALTER COLUMN cognito_id SET NOT NULL;

-- 6. Commit changes if no errors occurred
COMMIT;