# RevClear Usability Issues (From 2026-04-15 Session)

## Scope
This issue set is anonymized and grouped by product area to avoid duplicate tickets.
Participant names were removed.

## Stage 1: Navigation and Global Layout

### Issue 1: Sidebar toggle icon behavior is unclear
- Area: Navigation
- Problem: Users were unsure what the hamburger icon does and whether the sidebar should auto-change state.
- Proposed fix: Use explicit expand/collapse icon states with clear aria labels and a short helper hint in expanded mode.
- Priority: High

### Issue 2: Link visibility and discoverability gaps
- Area: Navigation
- Problem: At least one hyperlink was missed or unclear during navigation.
- Proposed fix: Increase contrast, consistent button/link styles, and improve focus states.
- Priority: Medium

## Stage 2: Patient Intake and Form UX

### Issue 3: Patient add flow has extra friction
- Area: Patient Management
- Problem: Adding a patient takes more clicks than expected.
- Proposed fix: Add direct entry points and reduce navigation depth.
- Priority: High

### Issue 4: Form semantics are unclear (gender none, encounter term, SOAP term)
- Area: Patient Data and Clinical Workflow
- Problem: Users did not understand terms such as None for gender, Encounter, and SOAP.
- Proposed fix: Replace ambiguous labels and add contextual helper text/tooltips.
- Priority: High

### Issue 5: Phone number formatting should be automatic
- Area: Patient Data
- Problem: Users expect automatic formatting for phone fields.
- Proposed fix: Auto-format to US pattern while preserving validation.
- Priority: Medium

### Issue 6: Patient and subscriber identity structure is confusing
- Area: Insurance and Demographics
- Problem: Confusion around first/last name split and relationship to subscriber.
- Proposed fix: Separate first and last name fields where needed and simplify subscriber relationship guidance.
- Priority: High

## Stage 3: Encounter, Audio, and Transcript Feedback

### Issue 7: Transcript capture status is not visible enough
- Area: Voice and Transcript
- Problem: Users cannot easily tell what was captured and whether transcript was saved.
- Proposed fix: Add explicit save/capture status indicator with timestamp and success/error state.
- Priority: High

### Issue 8: Audio replay capability is missing or not discoverable
- Area: Voice Workflow
- Problem: Users expected the ability to replay captured audio.
- Proposed fix: Add replay control or improve discoverability if already implemented.
- Priority: Medium

## Stage 4: Coding and Claims Submission UX

### Issue 9: CPT/code selection workflow is confusing
- Area: Coding
- Problem: Users were unclear how to choose or search codes.
- Proposed fix: Improve code search affordances and selection confirmation.
- Priority: High

### Issue 10: Claim submission screen has too much cognitive load
- Area: Billing and Claims
- Problem: Claim submission feels dense and difficult to parse.
- Proposed fix: Progressive disclosure, section grouping, and stronger visual hierarchy.
- Priority: High

### Issue 11: Self-pay logic and required fields are inconsistent
- Area: Billing and Insurance
- Problem: Self-pay selection does not consistently disable or relax insurance-related fields.
- Proposed fix: Conditional disabling and validation rules for self-pay path.
- Priority: Critical

### Issue 12: Claims dashboard drill-in should be direct
- Area: Claims Dashboard
- Problem: Users expect claim rows/cards to be clickable for detail view.
- Proposed fix: Make claim cards/rows open a detail view from dashboard.
- Priority: Medium

## Stage 5: Access Model and Deployment Readiness

### Issue 13: Role model needs explicit non-clinician paths
- Area: Access and Roles
- Problem: Questions remain about restrictions for nurses and billing staff.
- Proposed fix: Define role matrix and enforce feature-level visibility/edit permissions.
- Priority: High

### Issue 14: Onboarding and deployment expectations are mismatched
- Area: Onboarding and Setup
- Problem: Test feedback indicates confusion around deployment state and setup naming details.
- Proposed fix: Clarify environment status and tighten onboarding copy.
- Priority: Medium

## Unclear Items Requiring Follow-up
- Item 1: Not deployed yet. Clarify whether this means no production URL, no staging URL, or deployment blocker.
- Item 2: -R: name. Clarify intended meaning and target screen/field.
- Item 3: Is hamburger menu unclear/noted. Clarify whether confusion is icon meaning, click target size, or state persistence.
- Item 6/7: Auto change. Clarify expected auto behavior and exact trigger.
- Hyperlink noted issue. Clarify which link and in what screen/context.
- Weird icon when entering email. Clarify which page and whether it is an icon render bug or validation icon confusion.
- Insurance could be a dropdown. Clarify specific field(s): provider name, payer, plan type, or relationship.
- Zip code accuracy by state. Clarify if requirement is strict validation, autofill, or warning-only.
