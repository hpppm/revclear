# Intake Handoff — 2026-03-16-002

**Date:** 2026-03-16T17:10:00-04:00
**Request Type:** Security Problem
**Severity:** High

---

## Original Feedback
Add field-level encryption for PHI stored in patients, insurance_subscribers, and encounter clinical text such as chief_complaint, while keeping IDs, foreign keys, and non-sensitive scoping fields plaintext.

---

## Technical Spec
Implement GH-117 to extend application-layer PHI-at-rest encryption to field-level PHI stored in `patients`, `insurance_subscribers`, and encounter clinical text fields such as `encounters.chief_complaint`. The implementation must preserve plaintext storage for identifiers, foreign keys, and non-sensitive scoping/query fields, and it must support legacy-compatible mixed-mode reads so existing plaintext rows continue to work during rollout. The exact encrypted column set and any searchable plaintext exceptions require codebase investigation before implementation.

---

## Clarifications Gathered

**Q:** Which columns in `patients`, `insurance_subscribers`, and `encounters` are definitely in scope for GH-117, beyond `chief_complaint`?
**A:** idk

**Q:** Should GH-117 support legacy-compatible mixed-mode reads for existing plaintext rows, the same way GH-116 did?
**A:** yes

**Q:** Are there any fields in those tables that must explicitly remain plaintext besides IDs, foreign keys, and organization/clinician scoping fields?
**A:** idk

**Q:** Should this issue include only application-layer read/write encryption, or also any migration/backfill work for existing plaintext data?
**A:** yes

**Q:** For `patients`, which specific PHI columns are in scope for GH-117?
**A:** idk

**Q:** For `insurance_subscribers` and `encounters`, which exact PHI columns are in scope besides `chief_complaint`?
**A:** idk

**Q:** Should searchable/filtering fields remain plaintext if they contain PHI, or should GH-117 avoid encrypting any field that is currently used in lookup/scope queries?
**A:** idk

---

## Scope

**In scope:**
- Extend PHI-at-rest encryption coverage beyond `ai_results` into PHI-bearing columns in `patients`, `insurance_subscribers`, and encounter clinical text such as `chief_complaint`
- Preserve plaintext storage for IDs, foreign keys, and non-sensitive scoping fields
- Support legacy-compatible mixed-mode reads for existing plaintext rows during rollout
- Investigate exact encrypted column set for the affected tables before implementation

**Out of scope:**
- Changing identifier, foreign key, or non-sensitive organization/clinician scoping fields to encrypted storage
- Removing legacy plaintext compatibility during this issue
- Any assumptions about exact encrypted columns without analysis confirmation

**Affected users / roles:**
- All authenticated application users whose workflows read or write patient demographics, insurance subscriber data, or encounter clinical text
- Engineering and operations staff responsible for HIPAA PHI-at-rest controls

---

## Open Unknowns
- Which exact columns in `patients` should be encrypted in GH-117
- Which exact columns in `insurance_subscribers` should be encrypted in GH-117
- Which encounter clinical text fields beyond `chief_complaint` should be encrypted in GH-117
- Whether the user intended application-layer encryption only or also a backfill/migration for existing plaintext rows; the answer given was ambiguous and needs investigation
- Which PHI-bearing fields, if any, must remain plaintext because they are used in search/filter/query behavior

---

## Protected Zones (from CLAUDE.md)
- PHI tables and workflows: `patients`, `encounters`, `claims`, `ai_results`, `audio_records`, `audit_log`
- AWS-integrated systems: Cognito auth, S3 storage, RDS/PostgreSQL configuration
- Security-sensitive middleware and patterns in `backend/src/middleware/*`
- SQL query safety rules: parameterized queries only, explicit column lists only, no `SELECT *` / `RETURNING *`

---

## Do Not Touch
- IDs, foreign keys, and non-sensitive scoping fields that must remain plaintext
- Encryption scope already handled under GH-116 for `ai_results`
- Unrelated PHI systems not confirmed in scope for GH-117

---

## Severity Justification
This is a high-severity security hardening request because it expands encryption-at-rest coverage for additional PHI-bearing clinical and demographic data, and mistakes in scope or rollout could expose sensitive patient data or break core workflows.
