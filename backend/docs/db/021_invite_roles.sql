-- Migration: 021_invite_roles.sql
-- Description: Store the invited organization role on organization_invites
-- Security: Restricts invite-created roles to supported non-admin org member roles

ALTER TABLE organization_invites
ADD COLUMN IF NOT EXISTS role VARCHAR(32);

UPDATE organization_invites
SET role = 'clinician'
WHERE role IS NULL;

ALTER TABLE organization_invites
ALTER COLUMN role SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'organization_invites_role_check'
    ) THEN
        ALTER TABLE organization_invites
        ADD CONSTRAINT organization_invites_role_check
        CHECK (role IN ('clinician', 'nurse', 'billing_staff', 'receptionist'));
    END IF;
END $$;

COMMENT ON COLUMN organization_invites.role IS 'Role assigned to the user when the invite is redeemed';
