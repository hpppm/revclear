# Analysis Handoff — 2026-03-18-129

**Date:** 2026-03-18T20:40:00-0400
**Source Handoff:** `handoffs/GH-129/handoff.md`
**Request Type:** Feature Request
**Severity:** Medium

---

## Summary
GH-129 extends the existing organization invite-code system to become role-aware. The current implementation already has secure, hashed, expiring, single-use invite tokens and an atomic join transaction, but `organization_invites` does not store any role metadata and invite redemption only assigns organization membership, not a role. The correct implementation is to add an invite-role column, validate invite creation against organization member roles, and update the existing redemption transaction so the invite role is applied when the user joins.

---

## Root Cause (for bugs/regressions)
This is not a regression. The confirmed gap is that the invite system only knows which organization a code belongs to, not which role the joining user should receive.

Evidence from code:
- `backend/docs/db/018_organization_invites.sql` defines `organization_invites` without a `role` column.
- `backend/src/api/routes/organizations.ts` creates invite rows with only `organization_id`, `token_hash`, `created_by`, and `expires_at`.
- The same route redeems invites atomically but only updates `users.organization_id` and `users.is_org_admin`, not `users.role`.
- Frontend org API helpers in `frontend/app/lib/api/organizations.ts` currently expose `joinWithCode()` but no role-aware invite creation payload.

Inference:
- The existing join transaction is the correct place to assign the invited role because it already provides the atomic single-use guarantee.
- This requires a schema change before the route changes can work against the database.

---

## File Map

### Must change
- `backend/src/constants/roles.ts` — define organization-invite-eligible roles separately from the full app role set.
- `backend/src/types/zod.ts` — add invite creation schema for allowed roles.
- `backend/src/api/routes/organizations.ts` — create invites with roles and redeem invites by assigning the invited role.
- `backend/tests/security/security-fixes.test.ts` — update existing invite-related regression tests to match manager-role middleware and add invite-role assertions.
- `frontend/app/lib/auth/roles.ts` — expose organization member roles to frontend callers.
- `frontend/app/lib/api/organizations.ts` — add role-aware invite creation API helper.

### Must add
- `backend/docs/db/021_invite_roles.sql` — migration adding `organization_invites.role` with safe backfill/defaulting for existing rows.

### May be affected — verify after changes
- `backend/src/api/routes/me.ts` — user returned after later auth refresh should still expose the assigned role from the DB/Cognito model.
- `backend/src/utils/organization.ts` — no change expected, but verify role assignment logic doesn’t require helper changes.
- Future org management UI — depends on the new invite API contract.

### Reference only — do not modify
- `frontend/app/(pages)/signup/page.tsx` — signup invite-code flow is deferred.
- `frontend/app/dashboard/organization/page.tsx` — UI work deferred.
- Dev-only routes under `backend/src/api/routes/dev/` — out of scope.

---

## Execution Sequence

**Step 1: Add invite-role schema support** — Backend + Frontend
- Files:
  - `backend/src/constants/roles.ts`
  - `backend/src/types/zod.ts`
  - `frontend/app/lib/auth/roles.ts`
  - `frontend/app/lib/api/organizations.ts`
- Action:
  - define the allowed organization member roles for invites
  - add payload validation for invite creation
  - expose minimal frontend API support for creating role-aware invites
- Verify: frontend and backend compile cleanly with the new role-specific invite schema.

**Step 2: Add database migration for invite roles** — Database
- Files: `backend/docs/db/021_invite_roles.sql`
- Action:
  - add `organization_invites.role`
  - backfill existing rows to a safe default (`clinician`)
  - enforce non-null and allowed-role constraint
- Verify: file is idempotent and safe for existing invite rows.
- Depends on: Step 1

**Step 3: Update invite create/redeem flow** — Backend
- Files: `backend/src/api/routes/organizations.ts`
- Action:
  - require invite role on `POST /invite`
  - persist role on invite rows
  - during `POST /join`, consume the invite atomically and assign both org membership and invited role in the same transaction
  - preserve clean invalid/expired/used invite handling
- Verify: route code still uses auth, manager-role protection, parameterized SQL, and single-use transaction flow.
- Depends on: Step 2

**Step 4: Update regression coverage** — Backend Test
- Files: `backend/tests/security/security-fixes.test.ts`
- Action:
  - update invite middleware assertions to the new GH-128 manager-role model
  - add invite-role creation/redemption assertions
- Verify: focused invite/security test passes.
- Depends on: Step 3

**Step 5: Build and test verification** — Backend + Frontend
- Files: none
- Action:
  - run focused backend security tests
  - run backend build
  - run frontend typecheck
- Verify:
  - `cd backend && npx jest --config jest.config.ts --runTestsByPath tests/security/security-fixes.test.ts --verbose`
  - `cd backend && npm run build`
  - `cd frontend && npx tsc --noEmit`
- Depends on: Step 4

---

## Manual Steps (human action required)
1. Apply `backend/docs/db/021_invite_roles.sql` before expecting role-aware invite creation/redemption to work against the target database.

---

## Protected Zones
- Atomic invite redemption transaction.
- Organization manager route protection.
- Invite token hashing and single-use semantics.

---

## Do Not Touch
- Signup invite-code flow.
- Organization member-management UI.
- Dev-only admin routes.
- Non-invite organization settings behavior.

---

## Constraints
- Reuse the current invite/join flow; do not invent a second invite mechanism.
- Keep invite codes single-use and expiring.
- Restrict invite-created roles to `clinician`, `nurse`, `billing_staff`, and `receptionist`.
- Do not make `admin` assignable through invite codes.
- Preserve clean invalid/expired/already-used invite responses.

---

## Verification Checklist
After all steps are complete, Agent 4 should verify:
- [ ] `organization_invites` has a documented migration adding a non-null role column.
- [ ] Invite creation requires a valid organization member role.
- [ ] Invite creation stores the requested role.
- [ ] Invite redemption assigns the user to the org with the invited role.
- [ ] Invite redemption remains atomic and single-use.
- [ ] Invalid, expired, and already-used invite codes are rejected cleanly.
- [ ] Backend invite/security regression test passes.
- [ ] Backend build passes.
- [ ] Frontend typecheck passes.
- [ ] No signup-flow or organization-members UI changes were made in GH-129.

---

## Open Questions
- Whether existing DB deployment flow automatically applies new SQL files, or whether GH-129 will require a manual migration step in the target environment.
