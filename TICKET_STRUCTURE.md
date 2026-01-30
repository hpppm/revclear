# RevClear Ticketing & Workflow Guide

**Team Engineering Operations — Version 1.0**

This document defines how we create tickets, track work, name branches, review pull requests, and maintain a clean and scalable workflow for RevClear development. It ensures that every teammate follows the same structure and that work flows smoothly across backend, frontend, and AI modules.

## Table of Contents

1.  [Ticket Categories](#1-ticket-categories)
2.  [Ticket Naming Format](#2-ticket-naming-format)
3.  [Ticket Structure Template](#3-ticket-structure-template)
4.  [Branching Workflow](#4-branching-workflow)
5.  [Priority Levels](#5-priority-levels)
6.  [Sprint Structure](#6-sprint-structure)
7.  [Folder Conventions](#7-folder-conventions)
8.  [Example Ticket](#8-example-ticket)
9.  [Summary](#9-summary)

---

## 1. Ticket Categories

Each ticket **must** belong to one of these types:

- **`feature`**: New functionality (UI screens, API routes, AI)
- **`bug`**: Fixing an error, broken behavior, or regression
- **`ui/ux`**: Design improvements or layout changes
- **`chore`**: Refactor, cleanup, dependency upgrade, file restructuring
- **`documentation`**: Updating docs, readmes, diagrams, architecture notes
- **`devops`**: CI/CD, environment configuration, deployment work

## 2. Ticket Naming Format

Use this format for all ticket titles:

```
[type]: short description
```

**Examples:**

- `feature: implement login screen`
- `bug: fix audio upload freezing`
- `ui/ux: redesign patient list table`
- `chore: reorganize backend routes`
- `documentation: add API request guide`
- `devops: set up GitHub Actions`

## 3. Ticket Structure Template

Every ticket must include the following sections:

### Title

Short and descriptive.

**Example:** `feature: implement transcript review page`

### Description

Explain the purpose in 3–6 sentences.

**Example:**
Build the transcript review page for encounters. This page should display the AI-generated transcript from the audio upload flow. Clinicians should be able to scroll, edit text, and continue to the SOAP generation step. The page must match the frontend-only flow up to the first human review.

### Requirements

Bullet points. Clear. Testable.

**Example:**

- Display transcript area (read-only or editable)
- "Regenerate transcript" button (UI only, no backend integration initially)
- "Continue" button leading to SOAP step
- Responsive layout
- Load state and error state views

### Deliverables

What code must exist for this ticket to be considered "done".

**Example:**

- `/encounters/[id]/transcript` page
- `TranscriptViewer` component
- UI states (loading, error, empty)
- Integrated navigation to `/soap` page

### Acceptance Criteria

A checklist the reviewer uses to verify completion.

**Example:**

- [ ] Transcript loads correctly from mock API
- [ ] UI matches global layout specifications
- [ ] All buttons function as expected (navigation, UI-only actions)
- [ ] No console errors or warnings are present
- [ ] Page renders correctly on mobile, tablet, and desktop viewports

### Branch Name

Follow standardized branching rules, prefixed by the ticket type.

**Examples:**

- `feature/transcript-review`
- `bug/audio-upload-freeze`
- `ui/patient-table-redesign`
- `chore/backend-refactor`
- `documentation/update-api-guide`
- `devops/add-cicd`

## 4. Branching Workflow

Use the following development pattern for all work:

1.  **Always start from `main` and keep synced:**

    ```bash
    git checkout main
    git pull origin main
    git checkout -b [type of ticket]/your-feature-name
    ```

    _Do this every morning and before opening a Pull Request (PR)._

2.  **Push your work often:**

    ```bash
    git add .
    git commit -m "[ticket name]: implemented transcript layout"
    git push origin feature/transcript-review
    ```

3.  **Submit a Pull Request (PR):**
    A PR should be opened once the work on the branch is complete and ready for review.

    **PR Template Structure:**
    - **What changed:** A concise summary of the modifications.
    - **Why this change matters:** Explain the rationale and impact.
    - **Screenshots:** (For frontend changes) Visual evidence of the implemented feature/fix.
    - **Testing steps:** Clear instructions for how a reviewer can test the changes.

    **PR Name Format:**

    ```
    [Type] Short Description (e.g., [feature] Transcript Review Page)
    ```

4.  **PR Review Process:**
    Every PR **must** receive at least **1 approval** from another teammate before merging.

    **Reviewer Checklist:**
    - Logic makes sense and is idiomatic.
    - No obvious bugs or regressions introduced.
    - No commented-out or dead code.
    - No unnecessary `console.log` statements.
    - Adheres to project file conventions and coding standards.
    - Frontend loads and functions without errors (if applicable).

    Once approved and ready to merge:

    ```bash
    git checkout main
    git pull origin main
    git merge feature/your-feature-name # Use --no-ff for a non-fast-forward merge if preferred
    git push origin main
    ```

## 5. Priority Levels

We use a 4-level priority system to categorize the urgency of tickets:

| Priority | Meaning                                     | Examples                  |
| :------- | :------------------------------------------ | :------------------------ |
| `P0`     | Urgent, system-breaking, needs same-day fix | Authentication broken     |
| `P1`     | High priority, required for the next sprint | Audio upload inconsistent |
| `P2`     | Normal workflow item                        | Implement new UI screen   |
| `P3`     | Low priority / nice-to-have                 | Minor design polish       |

## 6. Sprint Structure

_(Use if you are organizing 1–2 week sprints.)_

Each sprint includes:

- Sprint planning
- Ticket assignment
- Development
- Code review
- Demo / testing
- Retrospective

Tickets within a sprint must include:

- Estimated time
- Assigned owner
- Difficulty rating (S, M, L)

## 7. Folder Conventions

To maintain consistency across the codebase:

### Frontend (`frontend/`)

- `frontend/app/...`: Next.js pages and route segments.
- `frontend/components/...`: Reusable UI components.
- `frontend/lib/...`: Helper functions, API calls, utility libraries.
- `frontend/styles/...`: Global styling (e.g., `globals.css`).
- `frontend/types/...`: TypeScript definitions and interfaces.

### Backend (`backend/`)

- `backend/src/api/routes/...`: Express route definitions and controllers.
- `backend/src/services/...`: Business logic and service layer implementations.
- `backend/src/models/...`: Data models (e.g., Mongoose schemas, ORM definitions).
- `backend/src/utils/...`: Shared utilities and helper functions.

## 8. Example Ticket

Here's a comprehensive example of a well-structured ticket:

---

**Title:** `feature: implement SOAP Note Review page`

**Description:**
Create the frontend page for reviewing AI-generated SOAP notes. This page is part of the encounter flow and appears after the transcript review. Clinicians must be able to edit each SOAP section (Subjective, Objective, Assessment, Plan) and approve the final note.

**Requirements:**

- Display Subjective, Objective, Assessment, Plan sections.
- Each section must have an editable text field.
- Include an "Approve SOAP Note" button (UI-only, marks as complete).
- Use `shadcn/ui` Card components for layout where appropriate.
- Implement loading state and empty state views.

**Deliverables:**

- `/encounters/[id]/soap` page component.
- `SOAPEditor` component (or similar sub-components for each section).
- Integration with frontend state management for editing and approval.

**Acceptance Criteria:**

- [ ] All editable fields function correctly and persist changes in local state.
- [ ] "Approve SOAP Note" button visually changes state or navigates as expected.
- [ ] UI adheres to the provided frontend specifications and design mockups.
- [ ] No console errors or warnings are logged during interaction.
- [ ] Page handles various data states (loading, empty, populated) gracefully.

---

## 9. Summary

This ticketing system and workflow guide ensures:

- **Clarity:** Every teammate understands their tasks and responsibilities.
- **Consistency:** Work is structured and implemented uniformly across the project.
- **Quality:** PRs are thoroughly reviewed, leading to cleaner, more stable code.
- **Organization:** Branches are tidy, and project progress is easily trackable.
- **Scalability:** The development process can efficiently support project growth and new features.
