-- Migration 022: Per-org clearinghouse HTTP credentials
-- Allows each organization to configure their own clearinghouse URL and API key
-- instead of relying on global environment variables.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS edi_clearinghouse_url text,
  ADD COLUMN IF NOT EXISTS edi_clearinghouse_api_key text;

COMMENT ON COLUMN organizations.edi_clearinghouse_url IS 'HTTP endpoint for clearinghouse claim submission (e.g. https://api.stedi.com/2024-01-01/x12/000000000/send)';
COMMENT ON COLUMN organizations.edi_clearinghouse_api_key IS 'API key for clearinghouse — stored server-side only, never sent to client';
