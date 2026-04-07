# Ship Report — 2026-03-16-003

**Date:** 2026-03-16T15:54:28-0400
**Request:** Add field-level encryption for PHI stored in patients, insurance_subscribers, and encounter clinical text such as chief_complaint, while keeping IDs, foreign keys, and non-sensitive scoping fields plaintext.
**Verdict:** ✅ SHIP

---

## Verification Summary

| Check | Status | Notes |
|---|---|---|
| Build | ✅ | `frontend` typecheck passed, `frontend` build passed after allowing Google Fonts fetch, `backend` tests passed, `backend` build passed |
| Database | ✅ | Migration file correctly handles DOB type conversion, constraint removal, and `clinician_patients` view recreation; developer confirmed migration `020` was applied successfully |
| Backend | ✅ | Patient, subscriber, encounter, claim preview, and dev-only patient paths encrypt/decrypt through shared helpers while keeping ownership checks and parameterized SQL intact |
| Frontend | ✅ | No frontend contract changes required; repo-level `frontend` build and typecheck passed against current backend-facing types |
| No Regression | ✅ | Patient and encounter route contracts remain unchanged, claim preview still decrypts PHI correctly, and do-not-touch route/type files remained untouched |
| Scope | ✅ | Only approved backend service/dev-route files were modified in the working tree, plus expected GH-117 handoff files |

---

## Blocking Issues (must fix before shipping)
None.

---

## Fix First Issues (should fix before shipping)
None.

---

## Pre-existing Issues (carry-forward, not caused by this change)
- `frontend` lint still reports 112 warnings in untouched files. There are no lint errors, and this did not block typecheck or build.

---

## Manual Steps Before Production Deploy
None. Developer confirmed the DB migration was applied and `PHI_ENCRYPTION_KEY` is present.

---

## What Was Verified
- `patients` writes encrypt the approved PHI fields while leaving IDs, foreign keys, `organization_id`, `clinician_id`, `primary_clinician_id`, and `insurance_payer_id` plaintext.
- `insurance_subscribers` writes encrypt approved PHI fields while leaving `id` and `patient_id` plaintext.
- `encounters.chief_complaint` encrypts on write and decrypts on read without changing API response shape.
- Mixed-mode reads preserve compatibility with legacy plaintext rows through explicit `revclear:phi:v1:` envelope detection.
- Claim preview reads decrypted patient/subscriber PHI before building claim payloads.
- Dev-only patient routes no longer bypass the relational PHI encryption rules.
- `backend` security regression tests, full `backend` test suite, `backend` build, `frontend` typecheck, and `frontend` production build all passed.

---

## Confidence Level
High — the modified storage paths, regression surface, build/test commands, and migration behavior were all verified directly, and the remaining manual prerequisites were explicitly confirmed complete.
