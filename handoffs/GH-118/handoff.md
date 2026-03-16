# Intake Handoff — 2026-03-16-001

**Date:** 2026-03-16T15:59:13-0400
**Request Type:** Security Problem
**Severity:** High

---

## Original Feedback
Encrypt PHI-bearing claim snapshot fields such as subscriber, billing_provider, service_facility, and rendering_provider, with transparent decryption on read so claim API contracts do not change.

---

## Technical Spec
Extend PHI-at-rest protection into PHI-bearing claim snapshot fields stored on `claims`, including at least `subscriber`, `billing_provider`, `service_facility`, and `rendering_provider`. The implementation must preserve existing claim API response shapes by decrypting on read before responses are returned. Mixed-mode reads are required so existing plaintext claim rows remain readable during rollout. IDs, foreign keys, claim status, timestamps, and other non-sensitive operational routing/scoping fields should remain plaintext unless analysis confirms a field is actually PHI-bearing and safe to encrypt without breaking filtering or reporting.

Backfill is not currently required by intake. The recommended rollout is application-layer encryption/decryption first, with any migration only if analysis discovers typed or constrained claim snapshot columns that cannot safely store encrypted text.

---

## Clarifications Gathered

**Q:** Which exact `claims` columns are in scope for GH-118 beyond `subscriber`, `billing_provider`, `service_facility`, and `rendering_provider`?
**A:** i dont really know

**Q:** Should GH-118 support legacy-compatible mixed-mode reads for existing plaintext claim rows, like GH-116 and GH-117?
**A:** yes

**Q:** Are any claim snapshot fields intentionally required to stay plaintext for filtering, joins, payer routing, or reporting?
**A:** no idea

**Q:** Does GH-118 include only application-layer encryption/decryption, or should it also include a migration/backfill plan for existing plaintext claim snapshots?
**A:** no idea

**Q:** what do you recommend
**A:** Encrypt only the PHI-bearing claim snapshot blobs/fields, not claim IDs, foreign keys, status fields, payer IDs, timestamps, or other operational routing fields. Support mixed-mode reads so existing plaintext claim rows still work during rollout. Include app-layer encryption/decryption now, and defer backfill to a separate issue unless historical claim snapshots must be rewritten. Expect a migration only if any in-scope claim snapshot columns are typed/constrained in a way that cannot hold encrypted text; if they are already `text`/`json`-friendly, avoid a migration.

**Q:** If you want, I’ll write the GH-118 Agent 1 handoff with those recommendations baked in.
**A:** yes

---

## Scope

**In scope:**
- Encrypt PHI-bearing claim snapshot fields on write for new and updated claim records.
- Transparently decrypt encrypted claim snapshot fields on read so existing claim API contracts do not change.
- Support mixed-mode reads for legacy plaintext claim rows during rollout.
- Determine the exact in-scope PHI-bearing claim snapshot fields by auditing the `claims` schema and claim payload builder paths.
- Keep non-sensitive operational fields plaintext unless analysis proves otherwise.

**Out of scope:**
- Historical backfill/rewrite of existing plaintext claim snapshots, unless analysis shows it is strictly required.
- Changing frontend claim response contracts or payload shapes.
- Re-scoping unrelated PHI systems already handled in GH-116 or GH-117.

**Affected users / roles:**
- Authenticated backend and frontend claim flows that create, read, preview, or return claim snapshot data.
- Internal/admin/dev claim consumers if they read or write the same `claims` snapshot fields.

---

## Open Unknowns
- Exact `claims` columns that currently hold PHI-bearing snapshot data beyond `subscriber`, `billing_provider`, `service_facility`, and `rendering_provider`.
- Whether those fields are stored as text, JSON, or another constrained type that would require a migration.
- Whether any PHI-bearing claim snapshot fields are currently used in filtering, routing, reporting, or joins and must remain plaintext.
- Which backend paths bypass the main claim service/repository layer and would otherwise remain plaintext write/read paths.
- Whether any claim-generation or EDI export paths consume raw `claims` snapshot values directly and need transparent decryption.

---

## Protected Zones (from CLAUDE.md)
- Auth/security middleware and route protection patterns, including `authMiddleware`, `requireOrganization`, and `requireRole(['admin'])`.
- PHI tables and systems with audit triggers, including `claims` and related healthcare workflow tables.
- Data minimization rules: do not introduce `SELECT *` or `RETURNING *` in client-facing claim queries.

---

## Do Not Touch
- Frontend claim API contracts and response shapes unless a regression forces investigation.
- IDs, foreign keys, claim status fields, timestamps, payer IDs, and other non-sensitive operational routing/scoping fields unless analysis confirms they are actually PHI-bearing.
- Backfill of historical plaintext claim snapshots unless the issue is explicitly re-scoped.

---

## Severity Justification
This is a high-severity PHI-at-rest hardening issue because claim snapshot data can contain sensitive patient/subscriber/provider information and the requested change affects production healthcare data handling.
