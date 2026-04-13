-- 021_claim_status_history.sql
-- Tracks every status change on a claim (submitted, denied, paid, etc.)
-- Already applied to AWS RDS database.
-- Friends do NOT need to run this — we all share the same AWS database.

CREATE TABLE IF NOT EXISTS public.claim_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    claim_id uuid NOT NULL,
    status text NOT NULL,
    reason text,
    changed_at timestamp without time zone DEFAULT now(),
    CONSTRAINT claim_status_history_pkey PRIMARY KEY (id),
    CONSTRAINT claim_status_history_claim_id_fkey
        FOREIGN KEY (claim_id) REFERENCES public.claims(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_claim_status_history_claim_id
    ON public.claim_status_history(claim_id);
