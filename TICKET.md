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
