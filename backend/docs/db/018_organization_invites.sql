-- Migration: 018_organization_invites.sql
-- Description: Add organization_invites table for secure cryptographic invite tokens
-- Security: Tokens are hashed (SHA-256) before storage to prevent theft if DB is compromised

-- Organization invitation tokens table
CREATE TABLE IF NOT EXISTS organization_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 hash of the raw token (hex encoded)
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ, -- NULL if not yet used
    used_by UUID REFERENCES users(id) -- User who redeemed the invite
);

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_organization_invites_token_hash ON organization_invites(token_hash);

-- Index for listing invites by organization
CREATE INDEX IF NOT EXISTS idx_organization_invites_org_id ON organization_invites(organization_id);

-- Index for cleanup of expired/used invites
CREATE INDEX IF NOT EXISTS idx_organization_invites_expires_at ON organization_invites(expires_at);

COMMENT ON TABLE organization_invites IS 'Stores hashed invitation tokens for secure organization joining';
COMMENT ON COLUMN organization_invites.token_hash IS 'SHA-256 hash of the raw token - raw token is never stored';
COMMENT ON COLUMN organization_invites.expires_at IS 'Tokens expire after 7 days by default';
