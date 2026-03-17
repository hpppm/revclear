# PHI Rollout Plan

## Current State

GH-116, GH-117, and GH-118 already encrypt new writes for these PHI storage paths:

- `ai_results.input_json` and `ai_results.output_json`
- encrypted relational PHI fields on `patients`
- encrypted relational PHI fields on `insurance_subscribers`
- `encounters.chief_complaint`
- `claims.billing_provider`
- `claims.service_facility`
- `claims.rendering_provider`
- `claims.subscriber`

Mixed-mode reads remain enabled. Encrypted rows are decrypted transparently, and legacy plaintext rows continue to read correctly.

## No Immediate Backfill Required

The current database contains disposable testing data only. No executable PHI backfill is required right now.

For the current repo state:

- keep mixed-mode reads enabled
- keep encrypt-on-write enabled
- reset or replace test data as needed
- do not add schema migrations solely for backfill

## Future Non-Test Backfill Plan

If a future environment contains real historical plaintext PHI in the GH-116/117/118 scope, use this rollout:

1. Confirm `PHI_ENCRYPTION_KEY` is present and identical in every target runtime.
2. Keep mixed-mode reads enabled before, during, and after the backfill.
3. Inventory plaintext rows in the scoped tables and columns.
4. Rewrite plaintext rows through application-safe encryption logic or a controlled script that uses the same envelope formats already in `backend/src/utils/crypto.ts`.
5. Verify row counts before and after rewrite, and spot-check decrypted application reads.
6. Leave mixed-mode support in place after completion so future restores/imports do not break reads.

## Backfill Safety Notes

- Do not remove plaintext fallback as part of the backfill.
- Do not log decrypted PHI during any rewrite.
- Do not change API response shapes during backfill work.
- Prefer batch processing with verification checkpoints over a single large rewrite.
