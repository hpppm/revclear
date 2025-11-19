# Dash Backend Workflow & Expectations

> **Read me first:** This dashboard is the canonical reference for how RevClear engineers exercise AWS helpers during development. Treat it as an interface contract. Future contributors (human or AI) should not refactor the communication layer inside `dash-backend` without a clear product decision, because onboarding, QA, and frontend work all rely on this exact flow.

## Why This App Exists

- Mirrors every `/api/dashboard/*` helper in a modern, client-side experience.
- Acts as the gating environment for any new frontend feature. Shipping UI changes must first demonstrate the flow here (mock state, API calls, auth, logging).
- Provides a preserved “old tech console” aesthetic so testers immediately know they are in the sandbox.

If you are a new Codex instance: consider this dashboard **read-only except for feature additions explicitly requested by the product team**. The Comms/UI glue code under `src/app/page.js`, `src/lib/dashboardClient.js`, and `src/app/dashboard.css` should be treated as the blueprint for frontend engineers. Do not rename IDs, change DOM structure, or alter request semantics unless you are porting these updates to the full frontend in the same task.

## Approved Workflow

1. **Run the backend API.**
   ```bash
   cd RevClear/backend
   npm install
   npm run dev
   ```
   - This exposes `/api/dashboard/*` routes that the dashboard consumes.

2. **Run the dashboard reference app.**
   ```bash
   cd RevClear/dash-backend
   npm install
   npm run dev
   ```
   - Uses Space Mono styling, built-in rewrite to `http://localhost:3005/api/*`.
   - Never deploy this outside the internal environment; it is for QA/dev only.

3. **Validate features here first.** When product requests a new frontend flow (e.g., another S3 helper, Dynamo records, etc.), implement and confirm it in `dash-backend`. Once stable, mirror the behavior into the main `frontend/` app.

## Structure Overview

| Path | Purpose | Notes |
|------|---------|-------|
| `src/app/page.js` | Main console layout + data attributes used by the client script. | Freeze component IDs; other packages rely on them. |
| `src/lib/dashboardClient.js` | Vanilla JS orchestration layer. Handles auth, S3 flows, anonymized logging. | Consider this the reference implementation for future React hooks/components. |
| `src/app/dashboard.css` | High-contrast console styling, button states, old-tech typography. | Use this file to see the exact visual tokens to match in other apps. |
| `src/app/globals.css` & `layout.js` | Space Mono font, “test environment” watermark, overall theme. | Do not rebrand unless product directs you. |
| `DASH_WORKFLOW.md` (this file) | Rules of engagement for AI/Human developers. | Keep it updated when policies change. |

## Communication Freeze

The “communication layer” refers to:
- How DOM elements signal actions (`data-action`, `data-open-panel`, etc.).
- How `initializeDashboard` wires event listeners and talks to `/api/dashboard`.
- How logs, statuses, and S3 helpers display data.

These parts **must** remain stable. If future work requires adjustments, explain the change in a new section at the bottom of this document before editing the code, so future agents understand why the interface evolved.

## Frontend Integration Expectations

1. **Mirror flows in `frontend/`**: When the real Next.js product needs a Cognito or S3 feature, replicate the behavior from `dash-backend` and document what changed.
2. **Use this dashboard as QA harness**: PMs and QA expect to verify bug fixes here. Never ship backend updates that break the dashboard interactions without coordinating updates here first.
3. **Logging & Redaction**: The dashboard already redacts tokens/emails. Carry this pattern over to production UI elements.

## If You Must Change Something

Only modify the dashboard when **all** conditions hold:
1. Product/tech lead explicitly approves the change.
2. You update this document to describe why the change was necessary.
3. You confirm the new behavior locally (`npm run lint`, run dashboard, test flows).
4. You inform the frontend team (or document in their README) about the new canonical behavior.

Remember: this app is the living spec. Preserve it carefully.***
