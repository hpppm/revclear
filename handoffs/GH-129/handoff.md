# Intake Handoff — 2026-03-18-129

**Date:** 2026-03-18T20:35:00-0400
**Request Type:** Feature Request
**Severity:** Medium

---

## Original Feedback
Allow organization managers to generate invite codes tied to a specific role.

---

## Technical Spec
Extend the existing organization invite-code flow so invite codes carry a specific organization role and assign that role when redeemed. Reuse the current single-use, expiring invite mechanism rather than introducing a second invite system.

The backend must store the invited role on `organization_invites`, require a valid role during invite creation, and apply that role atomically when the invite is redeemed. The frontend only needs the API support required to create role-aware invites in later UI work.

---

## Clarifications Gathered

**Q:** Should this issue reuse the current invite/join flow or create a separate invite mechanism?
**A:** Reuse the current flow.

**Q:** Should invite codes remain single-use and expiring?
**A:** Yes.

**Q:** Which roles should be valid for invite assignment?
**A:** Organization member roles only: `clinician`, `nurse`, `billing_staff`, `receptionist`.

**Q:** Should legacy `admin` be assignable through invites?
**A:** No. Legacy `admin` remains for compatibility, but invite-created memberships should use the product-facing organization roles.

---

## Scope

**In scope:**
- Extend `organization_invites` to store invited role.
- Update `POST /api/organizations/invite` to require and persist a valid invite role.
- Update `POST /api/organizations/join` to assign the invited role during redemption.
- Preserve single-use and expiry behavior.
- Add regression coverage for role-aware invite creation/redemption behavior.
- Add minimal frontend API support for role-aware invite creation.

**Out of scope:**
- Organization members UI.
- Invite generation UI.
- Signup invite-code field and auto-join behavior.
- Member role editing or member removal.
- Changing dev-only admin infrastructure routes.

**Affected users / roles:**
- Organization managers generating invites.
- New users joining organizations through invite codes.
- Invited clinicians, nurses, billing staff, and receptionists.

---

## Open Unknowns
- Whether existing local/dev databases already have `organization_invites` rows that need a backfill default when the role column is added.
- Whether production deployment tooling already applies SQL files from `backend/docs/db/` automatically or needs a manual migration step.

---

## Protected Zones (from CLAUDE.md)
- Organization invite creation and redemption flow.
- Transactional invite redemption logic.
- Authentication and manager-role protection on organization routes.
- Frontend org API contract shape.

---

## Do Not Touch
- Signup flow.
- Organization members UI.
- Cognito role-mapping logic outside what GH-128 already established.
- Dev-only admin routes.

---

## Severity Justification
This is a medium-severity foundational feature because later member-management and signup invite work depend on role-aware invites being correct. Incorrect role assignment here would create authorization bugs and invalid membership state.
