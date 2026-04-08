# Intake Handoff — 2026-03-18-130

**Date:** 2026-03-18T20:45:00-0400
**Request Type:** Feature Request
**Severity:** Medium

---

## Original Feedback
Add a members/invites section to the organization profile page.

---

## Technical Spec
Add organization-member and invite-management UI to the organization profile page, using the role-aware invite flow implemented in GH-129. The organization page should display current members, support creating new invites with a role selector, show the generated invite code and expiration, and allow the code to be copied. The page must match the existing dashboard layout and visual system.

Because the page also needs data to render, the implementation may include the minimal backend/API additions required to expose organization members and invite history.

---

## Clarifications Gathered

**Q:** Should this issue include revoke invite, edit member role, or remove member actions?
**A:** No. Keep scope to members display and invite creation/display.

**Q:** Which invite roles should be selectable?
**A:** `Clinician`, `Nurse`, `Billing staff`, `Receptionist`.

**Q:** Should the generated invite code be visible after creation?
**A:** Yes, visible once and copyable.

**Q:** Should users without invite codes still be able to sign up normally?
**A:** Yes, but signup invite-code handling is a later issue.

---

## Scope

**In scope:**
- Add a members table to the organization profile page.
- Add invite creation UI with role selector.
- Show the generated invite code and expiration.
- Add copy-to-clipboard interaction.
- Match the existing dashboard page layout/style.
- Add minimal backend/API support required to fetch organization members and invite history for the page.

**Out of scope:**
- Invite revocation.
- Member role editing.
- Member removal.
- Signup invite-code entry.
- Dedicated members management page outside organization profile.

**Affected users / roles:**
- Organization managers (`clinician`, legacy `admin`) using the organization profile page.
- Invited users who receive role-specific invite codes.

---

## Open Unknowns
- Whether the organization page should show all invite history or only recent invites.
- Whether non-manager users will ever access the organization profile page directly and need a specialized read-only fallback.

---

## Protected Zones (from CLAUDE.md)
- Organization manager route protection.
- Role-aware invite creation flow from GH-129.
- Existing organization settings form behavior.
- Dashboard layout consistency.

---

## Do Not Touch
- Signup flow.
- Member role editing/removal.
- Invite revoke endpoint/UI.
- Dev-only routes.

---

## Severity Justification
This is a medium-severity feature because it exposes the membership/invite workflow to real users. The underlying backend pieces already exist or are being minimally extended, but the product capability is not usable until this page-level UI exists.
