# Intake Handoff — 2026-03-16-001

**Date:** 2026-03-16T16:16:00-0400
**Request Type:** Security Problem
**Severity:** High

---

## Original Feedback
Implement shared mixed-mode decryption helpers, add automated tests for encrypted writes and legacy plaintext fallback, and define a migration/backfill plan for existing plaintext PHI in the database.

---

## Technical Spec
Consolidate mixed-mode PHI decryption behavior across the existing GH-116, GH-117, and GH-118 encryption work so shared helpers are used where duplication exists. Add automated backend test coverage proving encrypted writes and legacy plaintext fallback continue to work for the covered PHI storage paths. Evaluate whether a migration/backfill is actually needed for existing plaintext PHI from the GH-116/117/118 rollout scope.

Current developer guidance is that the database only contains disposable testing data, not real historical PHI, so GH-119 should assume no immediate production backfill is required unless analysis finds a concrete reason otherwise. Mixed-mode reads should remain supported even if no backfill is performed.

---

## Clarifications Gathered

**Q:** Which existing PHI areas are in scope for the shared helpers and backfill plan: only GH-116/117/118 data paths, or any other PHI tables too?
**A:** only 116,117,118

**Q:** Should GH-119 include only the shared helper code and documented migration/backfill plan, or should it also implement an actual executable backfill migration/script now?
**A:** yes if needed

**Q:** Do you want the backfill plan to preserve mixed-mode reads indefinitely, or is the goal to eventually remove plaintext fallback after migration?
**A:** preserve mixed mode

**Q:** Are there any environments where legacy plaintext rows must remain untouched for now, such as local/dev or historical audit retention needs?
**A:** no i dont think so

**Q:** so right now we have only testing data in the db, im not really sure if we need to backfill
**A:** Current recommendation is no immediate backfill if the database only contains disposable testing data. Keep mixed-mode reads, strengthen shared helpers and tests, and document that no production plaintext migration is required right now unless analysis finds a specific reason.

**Q:** yeah thats a good idea
**A:** approved

---

## Scope

**In scope:**
- GH-116, GH-117, and GH-118 PHI encryption paths only.
- Shared mixed-mode decryption helper consolidation where duplicate logic exists.
- Automated tests covering encrypted writes and legacy plaintext fallback for the scoped PHI storage paths.
- Analysis of whether a migration/backfill is actually needed for existing plaintext data in those scoped paths.
- Documentation or implementation of a migration/backfill approach only if analysis determines it is actually necessary.

**Out of scope:**
- Any PHI tables or flows outside the GH-116, GH-117, and GH-118 encryption scope.
- Removing mixed-mode plaintext fallback.
- Mandatory backfill of current test-only data if no real PHI migration need exists.
- Changing frontend API contracts or response shapes.

**Affected users / roles:**
- Authenticated backend and frontend flows that read or write PHI through the GH-116, GH-117, and GH-118 storage paths.
- Internal/dev scripts and helper paths that touch the same encrypted storage.

---

## Open Unknowns
- Whether there is enough duplicated mixed-mode logic across GH-116/117/118 to justify a new shared helper abstraction.
- Exact plaintext legacy-read locations still present across the scoped PHI storage paths.
- Whether GH-119 should produce only documentation for future backfill or also a runnable script for non-test environments.
- Whether any scoped scripts or helper paths still bypass the shared encryption/decryption behavior.

---

## Protected Zones (from CLAUDE.md)
- Auth/security middleware and route protection patterns, including `authMiddleware`, `requireOrganization`, and `requireRole(['admin'])`.
- PHI-bearing database tables and storage paths touched by GH-116, GH-117, and GH-118.
- Data minimization rules: do not introduce `SELECT *` or `RETURNING *` in client-facing queries.

---

## Do Not Touch
- PHI systems outside the GH-116, GH-117, and GH-118 issue scope.
- Frontend API contracts and response shapes unless a regression forces investigation.
- Removal of mixed-mode plaintext fallback behavior.
- Mandatory backfill of current test-only rows unless analysis proves it is required.

---

## Severity Justification
This is a high-severity PHI-at-rest hardening issue because it affects correctness and rollout safety of the application’s existing encrypted PHI storage paths.
