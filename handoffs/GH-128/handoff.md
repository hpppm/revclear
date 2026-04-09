# Intake Handoff — 2026-03-18-128

**Date:** 2026-03-18T18:45:00-0400
**Request Type:** Feature Request
**Severity:** Medium

---

## Original Feedback
Add support for the new organization roles and make clinician the org-management role.

---

## Technical Spec
Normalize the application role model across backend and frontend so the system consistently recognizes `clinician`, `nurse`, `billing_staff`, and `receptionist`, while preserving legacy `admin` compatibility during transition. Update role-aware validation, API assumptions, and frontend authorization helpers so `clinician` can manage organization settings and users.

This is the foundation issue for later organization-member management and invite-code work. It should not yet add invite role assignment, member management UI, or signup invite-code support.

---

## Clarifications Gathered

**Q:** Should `clinician` replace `admin` entirely right now, or should legacy `admin` remain valid during transition?
**A:** Keep legacy `admin` working during transition, but `clinician` should act as the normal organization manager role.

**Q:** Which roles must be added in this issue?
**A:** `clinician`, `nurse`, `billing_staff`, and `receptionist`.

**Q:** Should this issue also implement member-management UI or invite-code role assignment?
**A:** No. This issue is only the role-model foundation.

---

## Scope

**In scope:**
- Normalize the recognized application role set across backend and frontend.
- Add support for `nurse` and `receptionist`.
- Ensure `clinician` can manage organization settings and organization users.
- Update role-related validation and client-side authorization helpers.
- Preserve legacy `admin` compatibility during transition.

**Out of scope:**
- Role-aware organization invites.
- Signup invite-code handling.
- Organization member management UI.
- Member role editing or removal.
- Cognito infrastructure changes outside code assumptions in this repo.

**Affected users / roles:**
- Clinicians who need organization-management access.
- Nurses, billing staff, and receptionists whose roles must be recognized consistently by frontend and backend.
- Legacy admins who must continue working during transition.

---

## Open Unknowns
- Whether Cognito group names already exist for all new roles in deployed environments.
- Whether any untouched dev-only or security-only routes should remain `admin`-only instead of moving to the manager role model.

---

## Protected Zones (from CLAUDE.md)
- Authentication and authorization middleware.
- Organization management routes and user-listing routes.
- Frontend auth state and authorization helpers.
- Role validation and response schemas.

---

## Do Not Touch
- Invite-code data model or invite redemption behavior.
- Signup flow and auth UX beyond role recognition.
- Organization member-management UI.
- Dev-only admin infrastructure routes unless required by this issue.

---

## Severity Justification
This is a medium-severity foundation feature because later organization member/invite work depends on a consistent role model. If left inconsistent, later issues would layer new behavior on top of conflicting backend and frontend assumptions.
