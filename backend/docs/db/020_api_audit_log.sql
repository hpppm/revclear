-- Migration 020: Create api_audit_log table for HTTP request audit trail
-- HIPAA requirement: maintain audit trail of all PHI access via API
-- Replaces the flat file audit.log which has no rotation, encryption, or integrity guarantees.

CREATE TABLE IF NOT EXISTS public.api_audit_log (
    id          BIGSERIAL PRIMARY KEY,
    timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id     UUID,                        -- NULL for anonymous/unauthenticated requests
    method      TEXT NOT NULL,               -- HTTP method (GET, POST, etc.)
    url         TEXT NOT NULL,               -- Path without query string
    ip_address  TEXT,
    status_code INTEGER NOT NULL,
    duration_ms NUMERIC(10, 2),
    query_params JSONB,                      -- Sanitized query params (no tokens/PHI)
    body_summary JSONB                       -- Sanitized request body (no PHI field values)
);

-- Index for HIPAA access queries by user and time range
CREATE INDEX IF NOT EXISTS idx_api_audit_log_user_id   ON public.api_audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_api_audit_log_timestamp ON public.api_audit_log (timestamp DESC);

-- Prevent modification of audit records (append-only enforcement via revoke)
-- NOTE: Run as superuser if needed:
-- REVOKE UPDATE, DELETE ON public.api_audit_log FROM <app_user>;
