# Example Development Tickets

This document provides examples of well-structured development tickets, adhering to the guidelines outlined in `TICKETING.md`.

---

## 1. Ticket: Setup Landing Page

## STATUS: FINISHED

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

## [NARNI YOGA]

---

## 2. Ticket: Create Login Page UI

## STATUS: FINISHED

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

## [NARNI YOGA]

---

## 3. Ticket: Setup Global Layout Shell

## STATUS: FINISHED

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

## [NARNI YOGA]

## 4. Genkit: Install Genkit to the backend

## STATUS: FINISHED

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

## [RASMUS SEPPANEN]

## 5. RDS: RDS connection to testing-dashboard

## STATUS: FINISHED

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

## [RASMUS SEPPANEN]

## 6. BACKEND API ROUTES: Set up main routes in the backend

## STATUS: FINISHED

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

## [RASMUS SEPPANEN]

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

### ASSIGNED TO

## [RASMUS SEPPANEN]


---

## 8. PATIENTS & ENCOUNTERS API

## STATUS: FINISHED

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

## [BRENDAN]

---

## 9. TRANSCRIBE FLOW WITH S3 FALLBACK

## FINISHED

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

## [ASEEL]

---

## 10. SOAP / GENKIT FLOW (GENERATE, EDIT, SAVE)

## STATUS: FINISHED

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

## [RASMUS SEPPANEN]

---

## 11. Ticket: Frontend Authentication Integration

## STATUS: FINISHED

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

## [RASMUS SEPPANEN]

---

## 12. Ticket: My Profile Page

## STATUS: TODO

**Title:** `feature: my profile page`

**Description:**
Create a "My Profile" page that displays the authenticated user's information and allows them to view their account details. This page should fetch user data from the `/api/me` endpoint and display it in a clean, organized layout. The page should be accessible from the dashboard and provide a good user experience for viewing profile information.

**Requirements:**

- Create a new page at `/dashboard/profile`.
- Update the dashboard home page to link to the profile page (currently shows `href="#"`).
- Fetch user data from the Auth Context (already available from login).
- Display user information including:
  - Full name
  - Email address
  - Role (e.g., "clinician")
  - Account creation date
- Use consistent styling with the rest of the dashboard.
- Add a "Back to Dashboard" or navigation breadcrumb.
- Handle loading states while fetching data.
- Handle error states if user data is unavailable.

**Optional Enhancements:**

- Add an "Edit Profile" button (functionality can be implemented later).
- Show last login timestamp.
- Add a "Logout" button on the profile page.

**Deliverables:**

- New profile page component at `/dashboard/profile/page.tsx`.
- Updated dashboard home page with working profile link.
- Clean, responsive UI displaying user information.
- Proper error and loading state handling.

**Acceptance Criteria:**

- [ ] Profile page is accessible at `/dashboard/profile`.
- [ ] Dashboard home page links to the profile page.
- [ ] User information is displayed correctly (name, email, role, created date).
- [ ] Page uses consistent styling with the dashboard.
- [ ] Loading state is shown while data is being fetched.
- [ ] Error state is handled gracefully if data fetch fails.
- [ ] Page is responsive and works on mobile devices.
- [ ] User can navigate back to the dashboard.

**Branch Name:**
`feature/my-profile-page`

### ASSIGNED TO
## [RASMUS SEPPANEN]

# 🟢 Frontend: Encounter Flow

## 13. Ticket: Encounter Page & Metadata Form

## STATUS: FINISHED

**Title:** `feature: encounter page and metadata form`

**Description:**
Create the main encounter creation page and the initial metadata form. This is the entry point for the encounter flow.

**Requirements:**
- Create a page at `/dashboard/encounters/create` (or appropriate path).
- Implement a form to collect:
  - Date of encounter.
  - Patient selection (dropdown or search).
  - Provider (auto-filled from auth).
- "Next" or "Start" button to proceed to audio capture.
- Manage form state.

**Deliverables:**
- Encounter Page component.
- Metadata Form component.

**Acceptance Criteria:**
- [ ] Page loads successfully.
- [ ] User can select a patient and date.
- [ ] User can proceed to the next step (Audio).

**Branch Name:** `feature/encounter-page-form`

### ASSIGNED TO
## [NARNI YOGA]

---

## 14. Ticket: Audio Recorder Component

## STATUS: FINISHED

**Title:** `feature: audio recorder component`

**Description:**
Develop a reusable UI component for recording audio via the browser microphone.

**Requirements:**
- Request microphone permissions.
- Start, Stop, and Pause recording functionality.
- Visual feedback (timer, waveform, or simple indicator).
- Output the recorded audio as a Blob/File.
- Allow re-recording (discard and start over).

**Deliverables:**
- `AudioRecorder.tsx` component.

**Acceptance Criteria:**
- [ ] Component requests mic permission.
- [ ] User can record and stop audio.
- [ ] Recorded audio is available as a Blob.
- [ ] Visual feedback works during recording.

**Branch Name:** `feature/audio-recorder-component`

### ASSIGNED TO
## [NARNI YOGA]

---

## 15. Ticket: Audio Uploader Component

## STATUS: FINISHED

**Title:** `feature: audio uploader component`

**Description:**
Develop a reusable UI component for uploading existing audio files.

**Requirements:**
- File input for selecting audio files.
- Drag and drop zone.
- Validate file type (mp3, wav, m4a) and size.
- Display selected file name/info.
- Output the selected file to the parent component.

**Deliverables:**
- `AudioUploader.tsx` component.

**Acceptance Criteria:**
- [ ] User can select a file via dialog.
- [ ] User can drag and drop a file.
- [ ] Invalid files are rejected with a message.
- [ ] Selected file is passed to parent state.

**Branch Name:** `feature/audio-uploader-component`

### ASSIGNED TO
## [NARNI YOGA]

---

## 16. Ticket: Transcription Integration

## STATUS: FINISHED

**Title:** `feature: transcription integration`

**Description:**
Integrate the audio capture (Recorder/Uploader) with the backend transcription API.

**Requirements:**
- "Transcribe" button (active only when audio is ready).
- Send `multipart/form-data` request to `/api/transcribe`.
- Handle loading state (spinner/progress).
- Handle error states.
- Receive and store the JSON transcript in the frontend state.
- Display the transcript (or a summary) to the user.

**Deliverables:**
- Integration logic in the Encounter Page.
- API service function for transcription.

**Acceptance Criteria:**
- [ ] Clicking "Transcribe" sends audio to backend.
- [ ] Loading state is visible.
- [ ] Transcript JSON is received and stored.
- [ ] Errors are displayed gracefully.

**Branch Name:** `feature/transcription-integration`

### ASSIGNED TO
## [RASMUS SEPPANEN]

---

## 17. Ticket: SOAP Note Display

## STATUS: FINISHED

**Title:** `feature: soap note display`

**Description:**
Create a component to display the generated SOAP note in a readable format.

**Requirements:**
- Render the SOAP note sections (Subjective, Objective, Assessment, Plan).
- Support Markdown rendering if the backend returns markdown.
- Clean, professional styling.

**Deliverables:**
- `SoapNoteViewer.tsx` component.

**Acceptance Criteria:**
- [ ] SOAP note renders correctly.
- [ ] Sections are clearly distinguishable.

**Branch Name:** `feature/soap-note-display`

### ASSIGNED TO
## [NARNI YOGA]

---

## 18. Ticket: SOAP Note Editor & Save

## STATUS: TODO

**Title:** `feature: soap note editor`

**Description:**
Implement functionality to edit the generated SOAP note and save changes to the backend.

**Requirements:**
- Switch between "View" and "Edit" modes, or provide an always-editable text area.
- "Save" button to trigger `PUT /api/encounters/:id/soap`.
- Handle save success (toast notification) and error.
- Ensure local state stays in sync with edits.

**Deliverables:**
- `SoapNoteEditor.tsx` component (or updated Viewer).
- Integration with PUT endpoint.

**Acceptance Criteria:**
- [ ] User can edit the SOAP text.
- [ ] Clicking "Save" updates the backend.
- [ ] Success/Error feedback is provided.

**Branch Name:** `feature/soap-note-editor`

### ASSIGNED TO
## [RASMUS SEPPANEN]

---

## 19. Ticket: SOAP Regeneration

## STATUS: FINISHED

**Title:** `feature: soap regeneration`

**Description:**
Implement the "Try Again" or "Regenerate" flow for SOAP notes.

**Requirements:**
- "Regenerate" button.
- Call `POST /api/encounters/:id/soap` to re-trigger generation.
- Confirm action (modal?) to prevent accidental overwrite.
- Update the display with the new result.

**Deliverables:**
- Regeneration logic and UI button.

**Acceptance Criteria:**
- [ ] Clicking "Regenerate" calls the backend.
- [ ] New SOAP note replaces the old one.
- [ ] Loading state is shown during regeneration.

**Branch Name:** `feature/soap-regeneration`

### ASSIGNED TO
## [RASMUS SEPPANEN]

---
# 🔵 Medical Coding & Claims Flow

## 20. Ticket: Mock Medical Codes Data

## STATUS: TODO

**Title:** `feature: mock medical codes data`

**Description:**
Create mock datasets for CPT (procedure) and ICD-10 (diagnosis) codes to support the medical coding flow. These will be used by the Genkit flow to match codes against SOAP notes.

**Requirements:**
- Create `backend/genkit/data/mockCptCodes.json` with common CPT codes
- Create `backend/genkit/data/mockIcdCodes.json` with common ICD-10 codes
- Include at least 20-30 codes per category for testing
- Include codes for common scenarios (office visits, mental health, headaches, etc.)
- Each code should have: code, description, and category

**Deliverables:**
- `mockCptCodes.json` with CPT codes
- `mockIcdCodes.json` with ICD-10 codes

**Acceptance Criteria:**
- [ ] Mock data files exist in `backend/genkit/data/`
- [ ] Files contain valid JSON with proper structure
- [ ] Codes cover common medical scenarios
- [ ] Each code has required fields (code, description, category)

**Branch Name:** `feature/mock-medical-codes`

### ASSIGNED TO
## [RASMUS SEPPANEN]

---

## 21. Ticket: soapToCodes Genkit Flow

## STATUS: TODO

**Title:** `feature: soap-to-codes genkit flow`

**Description:**
Create a Genkit flow that analyzes SOAP notes and extracts relevant CPT and ICD-10 medical billing codes using Gemini 2.5 Flash. The flow should match the SOAP content against mock code datasets and return codes with confidence scores.

**Requirements:**
- Create `backend/genkit/flows/soapToCodes.ts`
- Load mock CPT and ICD-10 codes from JSON files
- Use Gemini to analyze SOAP note and suggest relevant codes
- Return matched codes with confidence scores (0-1)
- Include a tool to load mock codes: `mockCodesLoader`
- Handle cases where no codes match

**Deliverables:**
- `soapToCodes` Genkit flow
- `mockCodesLoader` tool
- Export from `backend/genkit/index.ts`

**Acceptance Criteria:**
- [ ] Flow accepts SOAP note as input
- [ ] Returns CPT and ICD codes with confidence scores
- [ ] Codes are validated against mock data
- [ ] Flow is testable in Genkit Studio
- [ ] Handles edge cases (no matches, low confidence)

**Branch Name:** `feature/soap-to-codes-flow`

### ASSIGNED TO
## [RASMUS SEPPANEN]

---

## 22. Ticket: Medical Codes API Endpoints

## STATUS: TODO

**Title:** `feature: medical codes api`

**Description:**
Create backend API endpoints for generating, fetching, and updating medical codes for encounters. Integrate with the `soapToCodes` Genkit flow and persist codes in the database.

**Requirements:**
- Create `backend/src/api/routes/codes.ts`
- `POST /api/encounters/:id/codes` - Generate codes from SOAP using Genkit
- `GET /api/encounters/:id/codes` - Fetch saved codes for encounter
- `PUT /api/encounters/:id/codes` - Update/edit codes
- Create `medical_codes` table in database
- Use Zod for validation
- Apply `authMiddleware` to all routes

**Deliverables:**
- Codes router with GET/POST/PUT endpoints
- Database migration for `medical_codes` table
- Integration with `soapToCodes` flow

**Acceptance Criteria:**
- [ ] POST generates codes and saves to DB
- [ ] GET returns saved codes (404 if none)
- [ ] PUT updates codes successfully
- [ ] All routes are auth-protected
- [ ] Validation errors return 400 with details
- [ ] No 5xx on happy paths

**Branch Name:** `feature/medical-codes-api`

### ASSIGNED TO
## [RASMUS SEPPANEN]

---

## 23. Ticket: Medical Codes Display Component

## STATUS: TODO
## 🟢 FRONTEND ONLY - NO BACKEND CHANGES

**Title:** `feature: medical codes display`

**Description:**
Create a UI component to display CPT and ICD-10 codes after SOAP generation. Allow users to review, edit, and remove codes that are based on the SOAP note before generating claims.

**Requirements:**
- Create `MedicalCodesViewer.tsx` component
- "Generate Codes" button (calls API, stub for now)
- Display CPT codes section (procedure codes) with code, description, category, and confidence score
- Display ICD-10 codes section (diagnosis codes) with code, description, category, and confidence score
- Allow removing individual codes
- Loading and error states
- Integrate into encounter flow after SOAP display

**Deliverables:**
- `MedicalCodesViewer.tsx` component
- Integration in encounter pages

**Acceptance Criteria:**
- [ ] Component displays codes in organized sections
- [ ] "Generate Codes" button triggers API stub call
- [ ] Loading state shown during generation
- [ ] Codes are editable/removable
- [ ] Error handling works
- [ ] Integrates smoothly into encounter flow

**Branch Name:** `feature/medical-codes-display`

### ASSIGNED TO
## [NARNI YOGA]

---

## 24. Ticket: Claims Generation Backend

## STATUS: TODO

**Title:** `feature: claims generation backend`

**Description:**
Create backend logic to generate insurance claims from medical codes. Format claims according to CMS-1500 structure and persist in the database.

**Requirements:**
- Create `backend/src/api/routes/claims.ts`
- `POST /api/encounters/:id/claim` - Generate claim from codes
- `GET /api/encounters/:id/claim` - Fetch saved claim
- Create `claims` table in database
- Format claim data (CMS-1500 structure)
- Include patient, provider, codes, and encounter info
- Support claim status (draft, submitted, approved, denied)
- Use Zod for validation

**Deliverables:**
- Claims router with POST/GET endpoints
- Database migration for `claims` table
- Claim formatting logic

**Acceptance Criteria:**
- [ ] POST generates claim from codes and encounter data
- [ ] Claim follows CMS-1500 structure
- [ ] GET returns saved claim (404 if none)
- [ ] All routes are auth-protected
- [ ] Claim includes all required fields
- [ ] No 5xx on happy paths

**Branch Name:** `feature/claims-generation`

### ASSIGNED TO
## [RASMUS SEPPANEN]

---

## 25. Ticket: Claims Display & Export

## STATUS: TODO
## 🟢 FRONTEND ONLY - NO BACKEND CHANGES

**Title:** `feature: claims display and export`

**Description:**
Create UI to display generated insurance claims and export them as PDF. Show claim status and allow users to review all claim details.

**Requirements:**
- Create `ClaimViewer.tsx` component
- Display all claim fields in organized sections
- "Generate Claim" button (calls API, stub for now)
- Export as PDF button
- Show claim status badge
- Display patient, provider, codes, and billing info
- Integrate into encounter flow after codes

**Deliverables:**
- `ClaimViewer.tsx` component
- PDF export functionality
- Integration in encounter page

**Acceptance Criteria:**
- [ ] Component displays claim in readable format
- [ ] "Generate Claim" button works with mock data
- [ ] PDF export downloads correctly
- [ ] Claim status is visible
- [ ] All claim fields are shown
- [ ] Integrates into encounter flow

**Branch Name:** `feature/claims-display-export`

### ASSIGNED TO
## [NARNI YOGA]

---
