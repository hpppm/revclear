# Analysis Handoff — 2026-03-18-128

**Date:** 2026-03-18T19:05:00-0400
**Source Handoff:** `handoffs/GH-128/handoff.md`
**Request Type:** Feature Request
**Severity:** Medium

---

## Summary
GH-128 is a role-model normalization issue. The existing repo partially assumes a three-role world of `admin`, `clinician`, and `billing_staff`, with organization-management behavior hardcoded to `admin` in several places. The main gaps are in backend Cognito-group role mapping, backend route protection on organization/user-management endpoints, frontend authorization helpers, and frontend/backend validation schemas. The correct implementation is to introduce a shared expanded role set, preserve `admin` for backward compatibility, and define `clinician` plus legacy `admin` as organization-manager roles for this transition phase.

---

## Root Cause (for bugs/regressions)
This is not a regression. The confirmed gap is that the codebase’s role assumptions are inconsistent with the desired product model.

Evidence from code:
- `backend/src/middleware/auth.ts` only mapped Cognito groups to `admin` and `clinician`, with no support for `nurse` or `receptionist`.
- `backend/src/api/routes/organizations.ts` still treated organization invite creation as `admin`-only and left organization patch access broader than the desired manager model.
- `backend/src/api/routes/users.ts` restricted organization user listing to `admin` only.
- `frontend/app/context/AuthContext.tsx` exposed `canManageOrganization` and `canManageUsers` only for `admin`.
- `frontend/app/lib/api/users.ts` blocked organization user listing client-side unless the caller role was `admin`.
- `frontend/app/lib/validation/schemas.ts` only accepted `admin`, `clinician`, and `billing_staff` in the frontend user schema.

Inference:
- The smallest safe transition is to keep `admin` working while expanding the role set and promoting `clinician` to manager capability.
- Invite-role assignment and signup invite handling must wait until GH-129+ because they need a settled role model first.

---

## File Map

### Must change
- `backend/src/middleware/auth.ts` — expand Cognito-group-to-role mapping.
- `backend/src/api/routes/organizations.ts` — make org-management routes use manager-role protection.
- `backend/src/api/routes/users.ts` — allow organization managers, not just `admin`, to list org users.
- `backend/src/types/zod.ts` — validate the expanded backend role set.
- `backend/src/types/express.d.ts` — update role documentation/comments for request user typing.
- `frontend/app/context/AuthContext.tsx` — normalize frontend role awareness and organization-management checks.
- `frontend/app/lib/api/users.ts` — allow organization managers client-side.
- `frontend/app/lib/types/index.ts` — type `User.role` against the shared role union.
- `frontend/app/lib/validation/schemas.ts` — accept the expanded role set.

### New shared files recommended
- `backend/src/constants/roles.ts` — backend role constants and organization-manager role list.
- `frontend/app/lib/auth/roles.ts` — frontend role constants and manager helper.

### May be affected — verify after changes
- `backend/src/api/routes/me.ts` — should continue returning a Cognito-derived role that matches the new union.
- `frontend/app/context/AuthContext.tsx` login/checkAuth boundaries — may need stronger typing at the auth edge.
- Any future organization-membership/invite work — depends on this role normalization being correct.

### Reference only — do not modify
- Dev-only routes under `backend/src/api/routes/dev/` — they may remain `admin`-only for infrastructure reasons.
- Signup flow — no invite-code changes in GH-128.
- Organization profile member-management UI — deferred.

---

## Execution Sequence

**Step 1: Add shared role constants** — Backend + Frontend
- Files: `backend/src/constants/roles.ts`, `frontend/app/lib/auth/roles.ts`
- Action: Define the expanded application role set and a shared “organization manager” concept that includes legacy `admin` and product-role `clinician`.
- Verify: type imports compile on both sides.

**Step 2: Normalize backend role interpretation and route protection** — Backend
- Files: `backend/src/middleware/auth.ts`, `backend/src/api/routes/organizations.ts`, `backend/src/api/routes/users.ts`, `backend/src/types/zod.ts`, `backend/src/types/express.d.ts`
- Action:
  - expand Cognito-group mapping to the full role set
  - update organization/user-management routes to allow manager roles
  - tighten schema typing to the supported role union
- Verify: backend TypeScript build passes and routes now use the manager-role constant where appropriate.
- Depends on: Step 1

**Step 3: Normalize frontend authorization and validation** — Frontend
- Files: `frontend/app/context/AuthContext.tsx`, `frontend/app/lib/api/users.ts`, `frontend/app/lib/types/index.ts`, `frontend/app/lib/validation/schemas.ts`
- Action:
  - update UI auth helpers to recognize all roles
  - make clinician a manager in frontend authorization checks
  - type frontend role fields against the shared role union
- Verify: frontend TypeScript no-emit check passes.
- Depends on: Step 1

**Step 4: Build verification** — Backend + Frontend
- Files: none
- Action: run backend build and frontend typecheck.
- Verify:
  - `cd backend && npm run build`
  - `cd frontend && npx tsc --noEmit`
- Depends on: Step 2, Step 3

---

## Manual Steps (human action required)
1. Confirm deployed Cognito/user-pool group names align with the new code mappings before relying on `nurse` or `receptionist` in non-local environments.

---

## Protected Zones
- Auth middleware role mapping.
- Organization and user-management route protection.
- Frontend auth context and role-based UI authorization helpers.

---

## Do Not Touch
- Invite-code role assignment.
- Signup flow changes.
- Member management UI.
- Dev-only admin infrastructure routes.

---

## Constraints
- Preserve legacy `admin` behavior during transition.
- Make `clinician` the canonical organization manager role in product behavior.
- Do not introduce partial role support where frontend and backend disagree.
- Keep the change small and foundational so later invite/member issues can build on it.

---

## Verification Checklist
After all steps are complete, Agent 4 should verify:
- [ ] Backend and frontend both recognize `clinician`, `nurse`, `billing_staff`, and `receptionist`.
- [ ] Legacy `admin` remains valid.
- [ ] `clinician` can manage organization settings and user-listing endpoints.
- [ ] Frontend auth helpers expose the new roles consistently.
- [ ] Backend role validation/schema typing accepts the expanded role set.
- [ ] Frontend type validation accepts the expanded role set.
- [ ] Backend build passes.
- [ ] Frontend typecheck passes.
- [ ] No invite-role or signup-flow behavior was changed in this issue.

---

## Open Questions
- Whether production Cognito group naming exactly matches `Admin`, `Clinician`, `Users`, `Nurse`, `BillingStaff`, and `Receptionist`. Code now supports those assumptions, but deployment still has to match.
