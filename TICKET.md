# Example Development Tickets

This document provides examples of well-structured development tickets, adhering to the guidelines outlined in `TICKETING.md`.

---

## 1. Ticket: Setup Landing Page

**Title:** `feature: setup landing page`

**Description:**
Create the initial landing page for the frontend. This will be the default page rendered when running the Next.js project. It should introduce the project, provide a simple welcome message, and link to the login page.

**Requirements:**

- Display a simple header (e.g., "Welcome to RevClear").
- Include descriptive text about the project's purpose.
- Provide a button linking to the `/login` page.
- Maintain a clean and minimal layout, consistent with the overall design.

**Deliverables:**

- `app/page.tsx` updated with landing page content.
- Basic styling applied using global styles and utility classes.

**Acceptance Criteria:**

- [ ] Page loads successfully at the root path (`/`).
- [ ] Header and description text are clearly visible.
- [ ] "Login" button is present and navigates correctly to `/login`.
- [ ] Page layout is clean and responsive.
- [ ] No console errors.

**Branch Name:**
`feature/landing-page`

### ASSIGNED TO

NAME GOES HERE

---

## 2. Ticket: Create Login Page UI

**Title:** `feature: create login page UI`

**Description:**
Implement the frontend-only login screen. This task focuses solely on the user interface; no backend integration or actual authentication logic is required yet. The goal is to create the layout, input fields for email and password, and a submit button.

**Requirements:**

- Include an email input field.
- Include a password input field.
- Provide a "Login" or "Submit" button.
- Implement basic client-side validation for empty fields.
- The layout should be centered, ideally within a card component.

**Deliverables:**

- `app/login/page.tsx` created with the login form UI.
- Potentially, a reusable `Input` component if deemed necessary for consistency.

**Acceptance Criteria:**

- [ ] Page loads successfully at `/login`.
- [ ] Email and password fields are present and interactive.
- [ ] Submit button is visible.
- [ ] Attempting to submit with empty fields displays a basic validation message.
- [ ] Layout is centered within a card.
- [ ] No console errors.

**Branch Name:**
`feature/login-page-ui`

### ASSIGNED TO

NAME GOES HERE

---

## 3. Ticket: Setup Global Layout Shell

**Title:** `feature: global layout shell`

**Description:**
Implement the foundational global layout for the frontend application. This layout will wrap all authenticated pages and establish the overall structure for navigation, spacing, and content rendering. The focus is strictly on the visual shell—no business logic or real data needs to be included at this stage. This layout will help ensure design consistency across all future pages.

**Requirements:**

- Create a global layout component that all dashboard pages will use.
- Include a placeholder top navigation bar.
- Include a placeholder sidebar (minimal or collapsible).
- Define a main content area where pages will be rendered.
- Ensure the layout uses consistent spacing and basic styling.
- The design should be simple at this stage—no interactive behavior required.

**Deliverables:**

- A layout file at `app/(dashboard)/layout.tsx` implementing the shell.
- Placeholder components for the navbar and sidebar (can be inline or separated into `components/`).
- Basic global layout styling.

**Acceptance Criteria:**

- [ ] Dashboard pages render inside the layout.
- [ ] Navbar placeholder is visible at the top of all pages within the dashboard group.
- [ ] Sidebar placeholder appears on the left side.
- [ ] Content area properly adjusts to the layout and spacing.
- [ ] No styling or layout errors in console.
- [ ] Layout does not break when resizing the window.

**Branch Name:**
`feature/global-layout`

### ASSIGNED TO

## RASMUS SEPPANEN

## 4. Genkit: Install Genkit to the backend

**Title:** `feature: global layout shell`

**Description:**
Install genkit dependencies and get the google ai studio to run.

**Requirements:**

- Install dependencies
- create a test flow
- set google ai credentials
- start the genkit server and see the studio

**Deliverables:**

- genkit folder in the backend
- 1 example flow
- 1 tool for getting the transcription file

**Acceptance Criteria:**

- 1 flow in google ai studio can run

**Branch Name:**
`feature/genkit-setup`

### ASSIGNED TO

## RASMUS SEPPANEN
