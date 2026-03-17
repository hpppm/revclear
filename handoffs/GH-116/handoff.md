# Intake Handoff — 2026-03-16-001

**Date:** 2026-03-16T15:20:00-04:00
**Request Type:** Security Problem
**Severity:** High

---

## Original Feedback
Okey lets implement them but we want to start with number 1 and do it properly with intake agent running first and put each agents handoff in the handoffs/GH-116/

---

## Technical Spec
Implement GH-116: encrypt PHI-bearing AI result data stored in `ai_results.input_json` and `ai_results.output_json` using the existing PHI encryption utility, while preserving backward compatibility for legacy plaintext rows already in the database. The implementation must keep current API response shapes unchanged for transcription and SOAP read/write flows, and must support mixed-mode reads during rollout so both encrypted and pre-existing plaintext records can be read safely.

---

## Clarifications Gathered

**Q:** Can the PHI encryption work be consolidated into fewer GitHub issues?
**A:** Yes. Consolidate into four issues and start with issue 1.

**Q:** What should issue 1 cover?
**A:** Encrypt AI result PHI with legacy-compatible reads.

**Q:** What does "mixed mode" mean for this encryption rollout?
**A:** The app must be able to read both old plaintext rows already in the database and new encrypted rows written after the change, so rollout does not break existing data before a backfill migration.

**Q:** Should implementation begin only after running the intake-agent flow and storing handoffs under `handoffs/GH-116/`?
**A:** Yes.

---

## Scope

**In scope:**
- Encrypt `ai_results.input_json` on write when it contains PHI-bearing AI request context.
- Encrypt `ai_results.output_json` on write for transcript and SOAP result storage.
- Add legacy-compatible read behavior so existing plaintext `ai_results` rows continue to work.
- Preserve existing backend route contracts for transcription and SOAP APIs.
- Store handoff artifacts for this issue under `handoffs/GH-116/`.

**Out of scope:**
- Encrypting patient demographics in `patients`.
- Encrypting subscriber demographics in `insurance_subscribers`.
- Encrypting claim snapshot data in `claims`.
- Encrypting encounter fields outside the AI result storage path.
- Removing legacy plaintext fallback or running a production data backfill in this issue.

**Affected users / roles:**
- All authenticated application users whose encounters use transcription and SOAP note workflows.
- Engineering and operations staff responsible for PHI-at-rest controls and rollout safety.

---

## Open Unknowns
- Whether existing plaintext `ai_results` rows require an explicit marker format for encrypted rows or whether read-path detection should be heuristic.
- Whether any additional AI result flows beyond transcript and SOAP currently store PHI and should be included under the same repository-layer encryption behavior.
- Whether tests should use mixed-mode fixtures against real legacy row shapes or mocked repository payloads only.

---

## Protected Zones (from CLAUDE.md)
- PHI tables and workflows: `patients`, `encounters`, `claims`, `ai_results`, `audio_records`, `audit_log`
- AWS-integrated systems: Cognito auth, S3 storage, RDS/PostgreSQL configuration
- Security-sensitive middleware and patterns in `backend/src/middleware/*`
- SQL query safety rules: parameterized queries only, explicit column lists only, no `SELECT *` / `RETURNING *`

---

## Do Not Touch
- Patient, subscriber, claim, and non-AI encounter PHI encryption scope outside GH-116
- Frontend routes, frontend API contracts, and deployment configuration unrelated to AI result PHI encryption
- Dev-only routes unless strictly required to maintain compatibility for encrypted `ai_results` reads

---

## Severity Justification
This is a high-severity security hardening request because transcript and SOAP payloads contain PHI and are currently stored in plaintext, affecting a core clinical workflow and HIPAA-relevant data handling.
