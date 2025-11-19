✅ 1. Authentication (Firebase Auth UI)
Screens:

Login Page

Signup Page

Forgot Password

UI Details:

Centered card (shadcn/ui → Card component)

Email + password input

“Continue” button

Feedback for errors (invalid password, missing inputs)

Redirect to /patients on successful login

State:

Store Firebase Auth token in memory (not localStorage)

Wrap the entire app in an <AuthProvider>

Add <ProtectedRoute> so all pages except login require auth

✅ 2. Patients Dashboard
Path: /patients
Purpose:

Show all patients the clinician manages.

UI:

Header: “Patients”

Search bar

Table list:

Name

DOB

Phone

Insurance

Last Encounter

“Add Patient” button → opens modal

Actions:

Click row → go to patient detail page

Create new patient (modal with form fields)

Edit existing patient (optional before first review)

Components:

PatientsTable

PatientFormModal

SearchInput

✅ 3. Patient Detail Page
Path: /patients/[patientId]
Purpose:

Show everything relevant about the individual patient before starting a new encounter.

UI Sections:

Patient Demographics (name, age, insurance)

Previous Encounters (list)

“Start New Encounter” button

Components:

PatientHeader

EncounterList

CTA Button

✅ 4. Start Encounter (Step 1: Setup)
Path: /encounters/new?patientId=...
Purpose:

Start an encounter by collecting the minimum data:

Encounter date/time (default = now)

Optional notes (not SOAP, just pre-encounter notes)

UI:

Title: “Start Encounter”

Encounter date picker

Free-text note input (“Reason for visit”)

“Start Encounter” button → goes to audio upload screen

Components:

EncounterSetupForm

After submit:

Go to Audio Recording / Upload page.

✅ 5. Encounter Step 2: Audio Recording / Upload
Path: /encounters/[id]/audio
Purpose:

Let the clinician either:

Upload an audio file
OR

Record audio directly in browser

UI:

Audio upload box (drag/drop)

“Record” button

Visualization of recording

Timer

“Finish Recording”

“Continue to Transcript Review”

Components:

AudioRecorder

AudioUploader

PrimaryButton

What happens next:

User presses Continue → Transcript Review.

✅ 6. Transcript Review (AI-Generated)
Path: /encounters/[id]/transcript
Purpose:

Show the transcript of the clinician’s recording.

UI:

Title: “Transcript”

Scrollable transcript text block

“Edit Transcript” (optional)

“Regenerate Transcript” (optional)

“Continue to SOAP Note”

Components:

TranscriptViewer

EditableTextBlock

Footer action bar with “Continue”

Goal:

The clinician approves the transcript before SOAP generation.

✅ 7. Generate SOAP Note (AI)
Triggered when clicking “Continue to SOAP Note”.
UI State:

Loading spinner with text:

“Generating SOAP note… This may take 5–10 seconds.”

Components:

LoadingScreen

maybe animated shimmer skeleton UI

After loading:

Redirect to SOAP Note Review screen.

✅ 8. SOAP Note Review (First Human Review)
Path: /encounters/[id]/soap
Purpose:

This is the final step you asked for — the SOAP note is displayed, ready for human review.

Nothing billing-related is included yet.

UI Layout:

A clean 4-section layout:

Subjective

Editable text field

Objective

Editable text field

Assessment

Editable text field

Plan

Editable text field

Optional additions:

“Show Transcript Side-by-Side”

“Expand All / Collapse All”

Autosave indicators

Buttons at bottom:

Save Draft

Approve SOAP Note ← FIRST HUMAN REVIEW ENDS HERE

Once the clinician clicks Approve, the frontend simply marks that step as complete.
