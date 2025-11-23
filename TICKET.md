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

### Narni Yoga

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

## Finished

**Title:** `feature: Expose and create API routes in the backend`

**Description:**
Baseline the production API wiring (no `/api/dev`): ensure middleware ordering, mount the primary routers, add `/api/health`, and stub `/api/me` until the dedicated tickets (7–10) fill in full CRUD/flows.

**Requirements:**

- Register and mount routers in `src/server.ts`: `/api/auth`, `/api/patients`, `/api/encounters`, `/api/claims`, `/api/transcribe`, `/api/soap`, `/api/me`, `/api/health` (stubs ok for new ones).
- Keep `/api/transcribe` mounted before `express.json` to preserve raw file stream.
- Apply middleware (`setupEnv`, `cors`, `helmet` with CSP, morgan, audit logger).
- Add `/api/health` (DB ping, optional S3) and a stub `/api/me` (will be fully implemented in ticket 7).
- Export `app` for tests (supertest) without changing start script behavior.

**Deliverables:**

- `src/server.ts` updated with production API registrations (no `/api/dev` dependency).
- Stubbed `/api/me` and `/api/health` endpoints responding 200.
- Middleware ordering documented/applied; `app` export available for tests.
- Make sure `/api/dev`still exists as a valid endpoint (required for testing-dashboard)

**Acceptance Criteria:**

- `npm run dev` starts cleanly on `localhost:3005` with routes mounted (no 5xx on startup requests).
- `/api/health` returns 200 with DB ping (and S3 if included).
- `/api/me` responds 200 (placeholder ok until ticket 7).
- `/api/transcribe` remains mounted before JSON parsing.

**Branch Name:**
`feature/backend-api-routes`

### ASSIGNED TO

## RASMUS SEPPANEN

---

## 7. USERS & `/api/me`

## STATUS: FINISHED

**Title:** `feature: add users api and /api/me`

**Description:**
Implement a production `/api/me` endpoint that returns the current authenticated user from the `users` table and creates the user row on first login if missing. Add minimal users CRUD as needed to support the frontend.

**Requirements:**

- Add `/api/me` (auth-protected) to fetch current user from DB; if absent, insert and return.
- Implement minimal `/api/users` CRUD (list/read/update/delete) if required; protect with auth.
- Use Zod for payload/param validation and return structured 4xx errors.
- Ensure audit logging for user-facing operations.

**Deliverables:**

- `/api/me` route wired to Postgres `users` table with create-on-first-login logic.
- Users endpoints with validation and auth (if needed for UI).

**Acceptance Criteria:**

- Authenticated request to `/api/me` returns the user row (creates if missing).
- Users endpoints enforce auth and validation; return 2xx/4xx (no 5xx on happy paths).
- No stack traces in responses; audit log captures calls.

**Branch Name:**
`feature/users-me-endpoint`

### Rasmus Seppanen

## NO ONE YET

---

## 8. PATIENTS & ENCOUNTERS API

## STATUS: Finished

**Title:** `feature: patients and encounters api`

**Description:**
Build fully validated patients and encounters routes for production (no `/api/dev`). CRUD for patients; CRUD for encounters tied to patients; enforce auth and use Zod validation.

**Requirements:**

- `/api/patients`: create/read/update/delete with Zod schemas; normalized envelopes.
- `/api/encounters`: create/read/update/delete, linking to patients; validate payloads.
- Apply `authMiddleware` to all routes; structured 4xx errors on validation issues.
- Ensure DB operations use the RDS pool and handle not-found gracefully.

**Deliverables:**

- Patients and encounters routers under `/api/patients` and `/api/encounters`.
- Zod schemas for payloads and params; shared error shape.

**Acceptance Criteria:**

- CRUD operations return 2xx/4xx appropriately (no 5xx on happy paths).
- Linking to patients is enforced for encounters; not-found returns 404.
- Validation errors return 400 with field-level detail; audit logging present.

**Branch Name:**
`feature/patients-encounters-api`

### ASSIGNED TO

## Brendan

---

## 9. TRANSCRIBE FLOW WITH S3 FALLBACK

## Finished

**Title:** `feature: transcribe flow with s3 fallback`

**Description:**
Implement production `/api/transcribe` that accepts audio uploads, streams to Whisper when present, and falls back to fetching audio from S3 if the request lacks the stream (e.g., page refresh). Keep original audio in S3; persist transcript in DB.

**Requirements:**

- Mount `/api/transcribe` before `express.json`; accept multipart audio.
- If request has audio stream, pipe directly to Whisper; otherwise, fetch from S3 (key in DB) and transcribe.
- Store audio in S3 and record in `audio_records` with status.
- Save transcript in `ai_results` (`flow_name=whisper_transcript`); optional S3 JSON snapshot.
- Zod-validate params/payload; auth-protect route; structured 4xx errors.

**Deliverables:**

- Transcribe route with dual-path handling (direct stream or S3 fallback).
- DB writes: `audio_records` entry and `ai_results` transcript entry.

**Acceptance Criteria:**

- Upload + transcribe works with immediate stream.
- Refresh scenario: transcribe succeeds by fetching audio from S3.
- Responses include transcript payload; original audio remains in S3.
- 2xx/4xx only on happy/error paths (no 5xx); audit logging present.

**Branch Name:**
`feature/transcribe-s3-fallback`

### ASSIGNED TO

## Aseel

---

## 10. SOAP / GENKIT FLOW (GENERATE, EDIT, SAVE)

## TODO

**Title:** `feature: soap genkit flow`

**Description:**
Expose SOAP generation endpoints for encounters using Genkit/Gemini. Support fetch, regenerate, and save edited SOAP. Use transcript from DB `ai_results` (no `/api/dev`), persist SOAP in DB, and optionally to S3.

**Requirements:**

- `/api/encounters/:id/soap` GET: fetch latest SOAP from DB.
- `/api/encounters/:id/soap` POST: generate (or regenerate) SOAP via Genkit using transcript from DB.
- `/api/encounters/:id/soap` PUT: save edited SOAP back to DB.
- Persist SOAP in `ai_results` (`flow_name=soap_gemini`), with optional S3 snapshot.
- Zod validation; auth on all endpoints; structured 4xx errors.

**Deliverables:**

- SOAP router under `/api/encounters/:id/soap` with GET/POST/PUT.
- Integration with Genkit (mock acceptable initially) and DB persistence.

**Acceptance Criteria:**

- GET returns latest SOAP (404 if none).
- POST triggers SOAP generation and saves result; returns 2xx.
- PUT updates saved SOAP; returns 2xx; validation errors return 400.
- No 5xx on happy paths; audit logging present.

**Branch Name:**
`feature/soap-genkit-flow`

### ASSIGNED TO

## Rasmus Seppanen

---

## 11. Ticket: Frontend Authentication Integration

## TODO

**Title:** `feature: frontend authentication integration`

**Description:**
Implement real authentication in the frontend by integrating with the backend API. This involves wiring up the existing login and signup pages to the `/api/auth` endpoints and ensuring that the user profile is created or retrieved via `/api/me` upon successful login. The goal is to have a fully functional authentication flow where users can sign up, sign in, and access protected routes.

**Requirements:**

- Integrate the Login page (`app/login/page.tsx`) with `POST /api/auth/signin`.
- Integrate the Signup page (`app/signup/page.tsx`) with `POST /api/auth/signup`.
- Handle the confirmation flow (if required by backend config) or auto-login after signup.
- Upon successful login, store the authentication tokens (e.g., in localStorage or cookies) securely.
- Call `GET /api/me` immediately after login to ensure the user record exists in the database and to fetch user details.
- Create an Auth Context or Hook to manage user state globally.
- Protect dashboard routes: redirect unauthenticated users to `/login`.
- Handle logout functionality.

**Deliverables:**

- Functional Login and Signup forms connected to the backend.
- Auth Context/Provider managing user state.
- Protected route implementation (e.g., middleware or higher-order component).
- User data available in the frontend application state.

**Acceptance Criteria:**

- [ ] User can sign up successfully; account is created in Cognito and backend.
- [ ] User can sign in with valid credentials.
- [ ] Invalid credentials show an error message.
- [ ] `GET /api/me` is called successfully after login.
- [ ] Unauthenticated access to `/dashboard/*` redirects to `/login`.
- [ ] Authenticated user can access `/dashboard`.
- [ ] Logout clears tokens and redirects to `/login`.

**Branch Name:**
`feature/frontend-auth-integration`

### ASSIGNED TO

## NO ONE YET

