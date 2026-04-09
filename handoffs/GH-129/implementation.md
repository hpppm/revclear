# Implementation Handoff — 2026-03-18-129

**Date:** 2026-03-18T20:50:00-0400
**Source Analysis:** `handoffs/GH-129/analysis.md`
**Request Type:** Feature Request
**Severity:** Medium
**Build Status:** CLEAN ✓

---

## What Was Built
GH-129 makes organization invite codes role-aware. Invite creation now requires a valid organization member role, invite rows persist that role, and invite redemption assigns the user to the organization with the invited role inside the same atomic single-use transaction.

This implementation reuses the existing invite/join flow exactly as requested. It does not add organization members UI or signup invite-code handling.

---

## Steps Completed

### Step 1: Add invite-role schema support ✅
- Files modified:
  - `backend/src/constants/roles.ts`
  - `backend/src/types/zod.ts`
  - `frontend/app/lib/auth/roles.ts`
  - `frontend/app/lib/api/organizations.ts`
- What changed:
  - added `ORGANIZATION_MEMBER_ROLES`
  - added backend invite payload schema
  - added frontend role-aware invite API payload support
- Verified with:
  - `cd backend && npm run build`
  - `cd frontend && npx tsc --noEmit`

### Step 2: Add database migration for invite roles ✅
- Files modified:
  - `backend/docs/db/021_invite_roles.sql`
- What changed:
  - added `organization_invites.role`
  - backfilled existing rows to `clinician`
  - enforced non-null and allowed-role constraint
- Verified with: visual review for idempotent SQL structure

### Step 3: Update invite create/redeem flow ✅
- Files modified:
  - `backend/src/api/routes/organizations.ts`
- What changed:
  - `POST /api/organizations/invite` now validates and stores invite role
  - `POST /api/organizations/join` now returns and applies invite role from the atomic consume step
  - redeemed `clinician` invites set `is_org_admin = true`; other invited roles do not
- Verified with:
  - focused security regression test
  - backend build

### Step 4: Update regression coverage ✅
- Files modified:
  - `backend/tests/security/security-fixes.test.ts`
- What changed:
  - updated invite/users middleware assertions to the GH-128 manager-role model
  - added assertions that invite role is stored and applied during redemption
- Verified with:
  - `cd backend && npx jest --config jest.config.ts --runTestsByPath tests/security/security-fixes.test.ts --verbose`

### Step 5: Build and test verification ✅
- Files modified: none
- What changed: ran targeted verification for the changed backend and frontend surfaces
- Verified with:
  - `cd backend && npx jest --config jest.config.ts --runTestsByPath tests/security/security-fixes.test.ts --verbose`
  - `cd backend && npm run build`
  - `cd frontend && npx tsc --noEmit`

---

## Steps Skipped or Deferred
- Organization member-management UI was deferred.
- Signup invite-code behavior was deferred.
- No runtime DB migration execution was performed; only the SQL file was added.

---

## Files Modified
- `backend/src/constants/roles.ts` — added invite-eligible organization member roles.
- `backend/src/types/zod.ts` — added invite creation schema for allowed roles.
- `backend/src/api/routes/organizations.ts` — invite creation now stores role; invite redemption now applies role atomically.
- `backend/tests/security/security-fixes.test.ts` — updated manager-role invite assertions and added role-aware invite checks.
- `backend/docs/db/021_invite_roles.sql` — migration adding `organization_invites.role`.
- `frontend/app/lib/auth/roles.ts` — added invite-eligible organization member roles.
- `frontend/app/lib/api/organizations.ts` — added role-aware invite creation API helper.

---

## Files NOT Modified (confirmed)
- `frontend/app/(pages)/signup/page.tsx` — no invite-code signup behavior added ✓
- `frontend/app/dashboard/organization/page.tsx` — no invite management UI added ✓
- `backend/src/api/routes/dev/*` — no dev admin route changes ✓
- `backend/src/utils/organization.ts` — unchanged ✓

---

## Manual Steps Completed by Developer
- None

## Manual Steps Still Required
- Apply `backend/docs/db/021_invite_roles.sql` to the target database before using role-aware invite creation/redemption.

---

## Open Questions Resolved
1. `Does this need a migration?` → Yes. `organization_invites` did not have a role column.
2. `Should admin be invite-assignable?` → No. Invite-created memberships should only use product-facing org roles.
3. `Should the current atomic join flow be reused?` → Yes. The role assignment was added into the existing transactional consume step.

---

## Build Verification
- Backend security test: CLEAN
- Backend TypeScript/build: CLEAN
- Frontend TypeScript no-emit check: CLEAN
- Commands run:
  - `cd backend && npx jest --config jest.config.ts --runTestsByPath tests/security/security-fixes.test.ts --verbose`
  - `cd backend && npm run build`
  - `cd frontend && npx tsc --noEmit`

---

## Known Limitations
- The migration file has been created but not applied.
- Invite-role behavior is backend/API only in GH-129; there is no members/invite UI yet.
- Signup still does not accept invite codes.
- Invited user role assignment currently updates the local `users.role` column; if deployed auth fully depends on external Cognito groups, later work may still be needed to align persistent membership role and identity-provider role sources.

---

## Verification Checklist for Agent 4
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
