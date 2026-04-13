# Analysis Handoff — 2026-03-18-130

**Date:** 2026-03-18T20:55:00-0400
**Source Handoff:** `handoffs/GH-130/handoff.md`
**Request Type:** Feature Request
**Severity:** Medium

---

## Summary
GH-130 adds the first usable organization members/invites UI to the existing organization profile page. The current page already matches the dashboard shell and contains the organization settings form, but it has no member listing, no invite generation controls, and no invite history surface. To make the page functional, the implementation also needs minimal backend/API support for listing current organization members and current organization invites. The correct implementation is to add those manager-only listing endpoints, expose frontend API helpers/types, and render the new UI as separate cards under the existing organization settings card.

---

## Root Cause (for bugs/regressions)
This is not a regression. The confirmed gap is missing UI and supporting read endpoints.

Evidence from code:
- `frontend/app/dashboard/organization/page.tsx` only manages organization settings and editing state.
- There was no members table, no invite role selector, no generated-code display, and no copy interaction.
- `frontend/app/lib/api/organizations.ts` supported `getCurrent`, `updateCurrent`, and `createInvite`, but not members/invite list retrieval.
- `backend/src/api/routes/organizations.ts` supported org fetch, role-aware invite creation, and invite redemption, but not members or invite-history listing for the organization page.

Inference:
- The smallest coherent implementation is to ship the page UI and the two read endpoints together.
- Revoke/edit/remove actions should remain deferred so this issue stays focused.

---

## File Map

### Must change
- `backend/src/api/routes/organizations.ts` — add members and invite-history endpoints.
- `backend/tests/security/security-fixes.test.ts` — extend security regression coverage for the new manager-only org endpoints.
- `frontend/app/lib/api/organizations.ts` — add frontend helpers for member and invite list retrieval.
- `frontend/app/lib/types/index.ts` — add frontend types for organization members and invite records.
- `frontend/app/dashboard/organization/page.tsx` — add members table, invite creation UI, generated-code display, copy interaction, and invite history cards.

### May be affected — verify after changes
- `frontend/app/context/AuthContext.tsx` — existing manager-role logic should continue to gate the new page section correctly.
- `backend/src/constants/roles.ts` and `frontend/app/lib/auth/roles.ts` — should continue to provide the role options used by the UI.

### Reference only — do not modify
- Signup page and auth flows.
- Any revoke/edit/remove member route or UI.
- Dev-only routes.

---

## Execution Sequence

**Step 1: Add manager-only org data endpoints** — Backend
- Files:
  - `backend/src/api/routes/organizations.ts`
  - `backend/tests/security/security-fixes.test.ts`
- Action:
  - add `GET /api/organizations/members`
  - add `GET /api/organizations/invites`
  - keep both manager-only
  - return organization-page-friendly response shapes
- Verify: focused backend security test passes and route code remains parameterized/manager-protected.

**Step 2: Add frontend API/types support** — Frontend
- Files:
  - `frontend/app/lib/api/organizations.ts`
  - `frontend/app/lib/types/index.ts`
- Action:
  - add typed organization members and invites retrieval helpers
  - validate returned payload shape before use
- Verify: frontend typecheck passes.

**Step 3: Build the organization page members/invites UI** — Frontend
- Files:
  - `frontend/app/dashboard/organization/page.tsx`
- Action:
  - render members table
  - render invite creation card with role selector
  - show generated code, expiration, and copy button
  - render recent invite history
  - keep layout aligned with the rest of the dashboard
- Verify: frontend typecheck passes and local frontend build succeeds.

**Step 4: Build and test verification** — Backend + Frontend
- Files: none
- Action:
  - run focused backend security test
  - run backend build
  - run frontend typecheck
  - run frontend production build in a network-capable environment
- Verify:
  - `cd backend && npx jest --config jest.config.ts --runTestsByPath tests/security/security-fixes.test.ts --verbose`
  - `cd backend && npm run build`
  - `cd frontend && npx tsc --noEmit`
  - `cd frontend && npm run build`

---

## Manual Steps (human action required)
None for code completion. Frontend production build may require a normal network-capable environment because of existing external Google Fonts dependency.

---

## Protected Zones
- Manager-only org endpoint protection.
- Existing organization settings edit flow.
- Role-aware invite creation flow from GH-129.

---

## Do Not Touch
- Signup invite-code flow.
- Revoke/edit/remove member functionality.
- Dev-only routes.

---

## Constraints
- Keep the organization page in the existing dashboard layout and visual system.
- Use the existing role-aware invite creation flow; do not duplicate invite logic.
- Do not broaden non-manager access to org membership/invite data.
- Keep the scope focused to display + invite creation only.

---

## Verification Checklist
After all steps are complete, Agent 4 should verify:
- [ ] Organization page displays current members.
- [ ] User can select `Clinician`, `Nurse`, `Billing staff`, or `Receptionist`.
- [ ] User can generate an invite code from the organization page.
- [ ] Generated code is visible once and can be copied.
- [ ] Recent invites are displayed on the page.
- [ ] `GET /api/organizations/members` is manager-only.
- [ ] `GET /api/organizations/invites` is manager-only.
- [ ] Backend security test passes.
- [ ] Backend build passes.
- [ ] Frontend typecheck passes.
- [ ] Frontend production build passes in the developer environment.

---

## Open Questions
- Whether invite history should eventually include revoke actions inline, or remain read-only until a later issue.
