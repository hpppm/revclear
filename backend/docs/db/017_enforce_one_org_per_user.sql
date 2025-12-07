-- =========================================================
-- Migration 017: Enforce one organization per user
-- =========================================================
-- Changes the organization membership model from many-to-many
-- to one-to-many (one user, one organization; one organization, many users)
--
-- This simplifies:
-- - Data scoping (no need to track "active" organization)
-- - HIPAA compliance (clearer data boundaries)
-- - Billing workflows (one NPI/Tax ID per user context)

-- =========================================================
-- STEP 1: Check for users with multiple organizations
-- =========================================================

-- Run this first to see if any users have multiple memberships
SELECT 
  u.id,
  u.email,
  u.full_name,
  COUNT(om.id) as org_count,
  STRING_AGG(o.name, ', ') as organizations
FROM users u
JOIN organization_memberships om ON u.id = om.user_id
JOIN organizations o ON om.organization_id = o.id
GROUP BY u.id, u.email, u.full_name
HAVING COUNT(om.id) > 1;

-- If this returns any rows, you need to decide which organization
-- each user should keep before proceeding!

-- =========================================================
-- STEP 2: Drop the old many-to-many table
-- =========================================================

-- Drop the organization_memberships table
DROP TABLE IF EXISTS organization_memberships CASCADE;

-- =========================================================
-- STEP 3: Add organization_id directly to users table
-- =========================================================

-- Add organization_id column to users
ALTER TABLE users
  ADD COLUMN organization_id uuid,
  ADD COLUMN is_org_admin boolean DEFAULT false;

-- Add foreign key constraint
ALTER TABLE users
  ADD CONSTRAINT users_organization_fk
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_users_organization ON users (organization_id);

-- =========================================================
-- STEP 4: Add comments for clarity
-- =========================================================

COMMENT ON COLUMN users.organization_id IS 'The single organization this user belongs to. A user can only be part of one organization at a time.';
COMMENT ON COLUMN users.is_org_admin IS 'Whether this user is an admin of their organization (can manage settings, invite users, etc.)';

-- =========================================================
-- STEP 5: Update organization invitation system
-- =========================================================

-- Organizations table already has invitation codes, but let's ensure they're documented
COMMENT ON TABLE organizations IS 'Healthcare organizations (clinics, practices). Each organization can have multiple users/clinicians.';

-- =========================================================
-- NOTES:
-- =========================================================
-- 
-- New Model:
--   users.organization_id → organizations.id (many-to-one)
--   
-- Relationships:
--   - One user belongs to ONE organization (or none)
--   - One organization has MANY users
--   - Users can leave and join different organizations (by updating organization_id)
--   
-- To get all users in an organization:
--   SELECT * FROM users WHERE organization_id = $1;
--   
-- To get a user's organization:
--   SELECT o.* FROM organizations o
--   JOIN users u ON u.organization_id = o.id
--   WHERE u.id = $1;
--   
-- To check if user is admin:
--   SELECT is_org_admin FROM users WHERE id = $1;
--
-- Migration from old model:
--   If you have existing data in organization_memberships, run this first:
--   
--   UPDATE users u
--   SET 
--     organization_id = om.organization_id,
--     is_org_admin = om.is_admin
--   FROM organization_memberships om
--   WHERE u.id = om.user_id
--   AND om.created_at = (
--     SELECT MAX(created_at) 
--     FROM organization_memberships 
--     WHERE user_id = u.id
--   );
--
