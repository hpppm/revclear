# Example Development Tickets

This document provides examples of well-structured development tickets, adhering to the guidelines outlined in `TICKETING.md`.

---

## 1. Ticket: Setup Landing Page

## TODO

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

## TODO

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

## TODO

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

## FINISHED

**Title:** `feature: genkit implementation`

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

## 5. RDS: RDS connection to testing-dashboard

## FINISHED

**Title:** `feature: RDS connection plus CRUD sample data`

**Description:**
Connect to the RDS database in aws

**Requirements:**

- Set env variables to connect to RDS
- Create a new RDS panel in testing-dashboard
- Create a new patient in the RDS
- Read the patients in the RDS
- Update a patient in the RDS
- Delete a patient in the RDS
- Visually see these functions work in the testing-dashboard

**Deliverables:**

- Succesful connection to RDS
- Succesfully send and retrieve the data

**Acceptance Criteria:**

- See the data in the testing-dashboard ui

**Branch Name:**
`feature/RDS-setup`

### ASSIGNED TO

## RASMUS SEPPANEN

## 6. BACKEND API ROUTES: Set up main routes in the backend

## TODO

**Title:** `feature: Expose and create API routes in the backend`

**Description:**
Stand up production-facing backend routes (not /api/dev) that the real frontend will call. This includes auth, patients, encounters, claims, transcription upload, and SOAP generation at `/api/*`, with correct middleware ordering for file uploads.

**Requirements:**

- Register and mount routers in `src/server.ts`: `/api/auth`, `/api/patients`, `/api/encounters`, `/api/claims`, `/api/transcribe`, `/api/soap`.
- Implement CRUD for patients and encounters; list/read (and create if available) for claims.
- Add transcription upload endpoint (mount before `express.json`) that preserves raw file stream and calls transcription flow.
- Add SOAP generation endpoint that accepts encounter/transcript payload and returns SOAP output (real).
- Apply middleware (`setupEnv`, `cors`, `helmet` with CSP, morgan, audit logger); ensure routes return 4xx on bad input without leaking stack traces.

**Deliverables:**

- `src/server.ts` updated with production API registrations (no /api/dev dependency).
- Routers/handlers for patients, encounters, claims, transcription, and SOAP generation under `/api/*`.
- Input validation and normalized error responses for new endpoints.

**Acceptance Criteria:**

- `npm run dev` starts cleanly on `localhost:3005` with these routes mounted.
- Patients/encounters support create/read/update/delete with 2xx/4xx (no 5xx on happy paths).
- Claims list/read (and create if implemented) return 2xx/4xx appropriately.
- Transcription route accepts file upload (Multer sees raw stream) and returns transcript payload.
- SOAP endpoint accepts payload and returns SOAP response from genki (real) with 2xx on success and 4xx on validation issues.

**Branch Name:**
`feature/backend-api-routes`

### ASSIGNED TO

## RASMUS SEPPANEN
