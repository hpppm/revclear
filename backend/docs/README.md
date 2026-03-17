# Backend Docs Home

All backend-specific documentation lives under this directory so the entire project can keep surface-level notes (in `README.md` at the root) while backend engineers have a dedicated place for operational guidance.

## Structure

- `dashboard/`: UX/integration specs for the auth-gated dashboard and the cards that drive Cognito/S3/DynamoDB.
- `db/`: SQL schemas, migration notes, and anything tied to the database layer.
- `phi-rollout-plan.md`: current PHI encryption rollout status and the future backfill playbook for non-test environments.
- `testing/`: (Add API/testing notes here once they exist.)

Each subfolder should focus on a single topic so it’s easy to link directly from the backend README or the feature docs you share with teammates.

## Static assets

The backend dashboard UI is now managed through `src/dashboard.html`, `src/dashboard.js`, and `src/dashboard.css`. These files are served via `/api/dashboard/ui` (with `/dashboard` as a shortcut route) and copied into `dist/` during `npm run build` so the production server can serve the same assets without a bundler.
