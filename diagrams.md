# RevClear Data Flow Diagrams

**Last Updated:** February 14, 2026  
**System:** AI-Assisted Medical Claims & Speech Transcription Platform

---

## 📊 Level 0 (Context Diagram)

```
                          ┌─────────────────┐
                          │   Clinician     │
                          │   User          │
                          └────────┬────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
            ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
            │   Audio      │ │   Patient    │ │   Claims     │
            │   Files      │ │   Records    │ │   Systems    │
            └──────────────┘ └──────────────┘ └──────────────┘
                    │              │              │
                    │              │              │
                    └──────────────┼──────────────┘
                                   │
                          ┌────────▼────────┐
                          │   RevClear      │
                          │   System        │
                          └────────┬────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
            ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
            │   SOAP       │ │   Medical    │ │   EDI/HCN    │
            │   Notes      │ │   Codes      │ │   Claims     │
            │              │ │   (ICD/CPT)  │ │              │
            └──────────────┘ └──────────────┘ └──────────────┘
```

---

## 🔄 Level 1 Data Flow Diagram (High-Level Process)

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                           REVCLEAR SYSTEM - LEVEL 1                            │
└────────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────────┐
                              │  1. AUDIO        │
                              │  UPLOAD &        │
                              │  STORAGE         │
                              └────────┬─────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
        ┌─────────────────┐  ┌──────────────┐  ┌──────────────────┐
        │  Clinician      │  │  Audio File  │  │  S3 Storage      │
        │  (User)         │  │  (WAV/MP3)   │  │  + Encryption    │
        └─────────────────┘  └──────────────┘  └──────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
        ┌──────────────────────┐  ┌──────────────────────┐
        │  2. TRANSCRIPTION    │  │  D1: Audio Records   │
        │  (Whisper AI)        │  │  (Database)          │
        └──────────┬───────────┘  └──────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  Text Transcript     │
        │  (Raw Speech-to-Text)│
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │  3. SOAP NOTE           │
        │  GENERATION             │
        │  (Genkit Flow)          │
        └──────────┬──────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
   ┌─────────┐         ┌──────────────┐
   │ Gemini  │         │  D2: AI      │
   │ 2.5 LLM │         │  Results DB  │
   └─────────┘         └──────────────┘
        │
        ▼
   ┌──────────────────┐
   │ SOAP Note        │
   │ • Subjective     │
   │ • Objective      │
   │ • Assessment     │
   │ • Plan           │
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────────────┐
   │  4. MEDICAL CODE         │
   │  EXTRACTION              │
   │  (Genkit Flow)           │
   └────────┬─────────────────┘
            │
   ┌────────┴────────┐
   │                 │
   ▼                 ▼
┌──────────┐    ┌──────────────────┐
│ Gemini   │    │  D3: Medical     │
│ 2.5 LLM  │    │  Codes Table     │
└──────────┘    └──────────────────┘
   │
   ▼
┌──────────────────────┐
│ Medical Codes        │
│ • ICD-10 Diagnosis   │
│ • CPT Procedures     │
│ • Modifiers          │
└────────┬─────────────┘
         │
         ▼
┌────────────────────────────┐
│  5. CLAIM GENERATION       │
│  (CMS-1500 / UB-04)        │
└────────┬───────────────────┘
         │
    ┌────┴────┐
    │          │
    ▼          ▼
┌────────┐ ┌──────────────┐
│ Claims │ │  D4: Claims  │
│ Object │ │  Database    │
└────┬───┘ └──────────────┘
     │
     ▼
┌──────────────────────┐
│  6. EDI SUBMISSION   │
│  (X12 Format)        │
└────────┬─────────────┘
         │
    ┌────┴────┐
    │          │
    ▼          ▼
 ┌────┐   ┌──────────────┐
 │HCN │   │ D5: Audit    │
 │/EDI│   │ Log (PHI)    │
 └────┘   └──────────────┘
```

---

## 🔍 Level 2 Data Flow Diagram (Detailed Processes)

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                      REVCLEAR SYSTEM - LEVEL 2 (DETAILED)                      │
└────────────────────────────────────────────────────────────────────────────────┘

╔════════════════════════════════════════════════════════════════════════════════╗
║  PROCESS 1: AUDIO UPLOAD & TRANSCRIPTION                                       ║
╚════════════════════════════════════════════════════════════════════════════════╝

    ┌─────────────────┐
    │  1.1 Upload     │
    │  Audio File     │
    └────────┬────────┘
             │
             ▼
    ┌────────────────────────────┐
    │  Validate:                 │
    │  • File type (WAV/MP3)     │
    │  • Size (<500MB)           │
    │  • User auth (JWT)         │
    │  • Organization access     │
    └────────┬───────────────────┘
             │
             ▼
    ┌────────────────────────────┐
    │  1.2 Encrypt & Store       │
    │  in S3 (AES-256)           │
    └────────┬───────────────────┘
             │ ┌──────────────────────┐
             │ │ S3 Storage Asset      │
             │ │ • Bucket policies     │
             │ │ • Encryption key      │
             │ │ • Versioning enabled  │
             │ └──────────────────────┘
             │
             ▼
    ┌────────────────────────────┐
    │  1.3 Log audio record      │
    │  to Database               │
    │  • S3 path                 │
    │  • Upload timestamp        │
    │  • User ID                 │
    │  • Organization ID         │
    └────────┬───────────────────┘
             │
    ┌────────▼──────────────────┐
    │  D1: audio_records        │
    │  ┌──────────────────────┐ │
    │  │ id                   │ │
    │  │ user_id              │ │
    │  │ organization_id      │ │
    │  │ s3_path              │ │
    │  │ file_size            │ │
    │  │ uploaded_at          │ │
    │  │ ai_result_id (FK)    │ │
    │  └──────────────────────┘ │
    └──────────────────────────┘
             │
             ▼
    ┌─────────────────────────┐
    │  1.4 Whisper Transcribe │
    │  (Python Service)       │
    └────────┬────────────────┘
             │
             ▼
    ┌────────────────────────────┐
    │  1.5 Store Transcript      │
    └────────┬───────────────────┘
             │
    ┌────────▼──────────────────┐
    │  D2: ai_results (trans)   │
    │  ┌──────────────────────┐ │
    │  │ id                   │ │
    │  │ audio_record_id (FK) │ │
    │  │ transcript           │ │
    │  │ confidence_score     │ │
    │  │ created_at           │ │
    │  └──────────────────────┘ │
    └──────────────────────────┘


╔════════════════════════════════════════════════════════════════════════════════╗
║  PROCESS 2: SOAP NOTE GENERATION                                               ║
╚════════════════════════════════════════════════════════════════════════════════╝

    ┌─────────────────────┐
    │  2.1 Fetch          │
    │  Transcript         │
    └────────┬────────────┘
             │
             ▼
    ┌────────────────────────────┐
    │  2.2 Call Genkit Flow      │
    │  (speechToSoap)            │
    │  Input: Transcript         │
    └────────┬───────────────────┘
             │
    ┌────────▼──────────────┐
    │ Gemini 2.5 Flash LLM  │
    │ Prompt: SOAP format   │
    │ Temperature: 0.3      │
    └────────┬──────────────┘
             │
             ▼
    ┌────────────────────────────┐
    │  2.3 Parse SOAP Response   │
    │  • Subjective              │
    │  • Objective               │
    │  • Assessment              │
    │  • Plan                    │
    └────────┬───────────────────┘
             │
             ▼
    ┌────────────────────────────┐
    │  2.4 Encrypt SOAP Note     │
    │  (PHI_ENCRYPTION_KEY)      │
    └────────┬───────────────────┘
             │
    ┌────────▼──────────────────┐
    │  D3: ai_results (soap)    │
    │  ┌──────────────────────┐ │
    │  │ id                   │ │
    │  │ transcript_result_id │ │
    │  │ soap_note (encrypted)│ │
    │  │ model_name           │ │
    │  │ tokens_used          │ │
    │  │ created_at           │ │
    │  └──────────────────────┘ │
    └──────────────────────────┘


╔════════════════════════════════════════════════════════════════════════════════╗
║  PROCESS 3: MEDICAL CODE EXTRACTION                                            ║
╚════════════════════════════════════════════════════════════════════════════════╝

    ┌─────────────────────┐
    │  3.1 Fetch SOAP     │
    │  Note               │
    └────────┬────────────┘
             │
             ▼
    ┌────────────────────────┐
    │  3.2 Call Genkit Flow  │
    │  (soapToCodes)         │
    │  Input: SOAP note      │
    └────────┬───────────────┘
             │
    ┌────────▼──────────────┐
    │ Gemini 2.5 Flash LLM  │
    │ Prompt: ICD/CPT match │
    │ Code sets loaded      │
    └────────┬──────────────┘
             │
             ▼
    ┌────────────────────────────┐
    │  3.3 Parse Code Response   │
    │  • ICD-10 codes            │
    │  • CPT codes               │
    │  • Modifiers               │
    │  • Confidence scores       │
    └────────┬───────────────────┘
             │
             ▼
    ┌────────────────────────────┐
    │  3.4 Validate Codes        │
    │  Against Code Sets         │
    │  • Check code validity     │
    │  • Verify bundling rules   │
    │  • Compliance check        │
    └────────┬───────────────────┘
             │
    ┌────────▼──────────────┐
    │  D4: medical_codes    │
    │  ┌──────────────────┐ │
    │  │ id               │ │
    │  │ soap_result_id   │ │
    │  │ code_type        │ │
    │  │ code             │ │
    │  │ description      │ │
    │  │ confidence       │ │
    │  │ verified         │ │
    │  └──────────────────┘ │
    └───────────────────────┘


╔════════════════════════════════════════════════════════════════════════════════╗
║  PROCESS 4: CLAIM GENERATION                                                   ║
╚════════════════════════════════════════════════════════════════════════════════╝

    ┌──────────────────────┐
    │  4.1 Fetch Data      │
    │  • Encounter         │
    │  • Medical codes     │
    │  • Patient           │
    │  • Provider          │
    └────────┬─────────────┘
             │
    ┌────────▼──────────────────┐
    │  D5: encounters          │
    │  D6: patients            │
    │  D7: users/clinicians    │
    │  D8: organizations       │
    └────────┬──────────────────┘
             │
             ▼
    ┌──────────────────────────┐
    │  4.2 Format Claim Type   │
    │  [CMS-1500 / UB-04]      │
    │  Based on setting type   │
    └────────┬─────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌──────────┐      ┌──────────┐
│CMS-1500  │      │  UB-04   │
│Prof. Claim│      │Inst. Clm │
└────┬─────┘      └────┬─────┘
     │                 │
     └────────┬────────┘
              │
              ▼
    ┌──────────────────────────┐
    │  4.3 Populate Fields     │
    │  • Provider details      │
    │  • Patient demographics  │
    │  • Diagnosis (ICD-10)    │
    │  • Procedures (CPT)      │
    │  • Charges/totals        │
    └────────┬─────────────────┘
             │
             ▼
    ┌──────────────────────────┐
    │  4.4 Validate Claim      │
    │  • Required fields       │
    │  • Valid diagnosis codes │
    │  • Procedure bundling    │
    └────────┬─────────────────┘
             │
    ┌────────▼──────────────┐
    │  D9: claims          │
    │  ┌──────────────────┐ │
    │  │ id               │ │
    │  │ encounter_id (FK)│ │
    │  │ claim_type       │ │
    │  │ patient_id       │ │
    │  │ provider_id      │ │
    │  │ total_charges    │ │
    │  │ status           │ │
    │  │ created_at       │ │
    │  └──────────────────┘ │
    └───────────────────────┘


╔════════════════════════════════════════════════════════════════════════════════╗
║  PROCESS 5: EDI SUBMISSION & TRACKING                                          ║
╚════════════════════════════════════════════════════════════════════════════════╝

    ┌────────────────────┐
    │  5.1 Format EDI    │
    │  X12 837P/I        │
    └────────┬───────────┘
             │
             ▼
    ┌────────────────────────────┐
    │  5.2 Encrypt EDI File      │
    │  (TLS + AES-256)           │
    └────────┬───────────────────┘
             │
             ▼
    ┌────────────────────────────┐
    │  5.3 Transmit to Clearance │
    │  House/Payer (SFTP/API)    │
    └────────┬───────────────────┘
             │
    ┌────────▼──────────────┐
    │  EDI Transmission     │
    │  System (HCN/Payer)   │
    └────────┬──────────────┘
             │
             ▼
    ┌────────────────────────────┐
    │  5.4 Log EDI Submission    │
    └────────┬───────────────────┘
             │
    ┌────────▼──────────────┐
    │  D10: edi_batches    │
    │  ┌──────────────────┐ │
    │  │ id               │ │
    │  │ claim_id (FK)    │ │
    │  │ edi_file (x12)   │ │
    │  │ transmission_id  │ │
    │  │ sent_at          │ │
    │  │ status           │ │
    │  └──────────────────┘ │
    └───────────────────────┘
             │
             ▼
    ┌────────────────────────────┐
    │  5.5 Receive 999/997       │
    │  Acknowledgment            │
    │  • 999 = Parse error       │
    │  • 997 = Validation error  │
    └────────┬───────────────────┘
             │
    ┌────────▼──────────────┐
    │  D11: edi_responses  │
    │  ┌──────────────────┐ │
    │  │ id               │ │
    │  │ batch_id (FK)    │ │
    │  │ response_code    │ │
    │  │ error_details    │ │
    │  │ received_at      │ │
    │  └──────────────────┘ │
    └───────────────────────┘


╔════════════════════════════════════════════════════════════════════════════════╗
║  PROCESS 6: AUDIT & SECURITY LOGGING (ALL PROCESSES)                          ║
╚════════════════════════════════════════════════════════════════════════════════╝

    ┌─────────────────────────────────┐
    │  All API Requests               │
    │  All PHI Access                 │
    │  All Data Modifications         │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │  6.1 Auth Middleware            │
    │  Verify JWT                     │
    │  Extract user/org context       │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │  6.2 Audit Middleware           │
    │  • Log request: timestamp, IP,  │
    │    user, method, path           │
    │  • Log response: status, duration│
    │  • Redact sensitive data        │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │  6.3 Database Triggers          │
    │  On INSERT/UPDATE/DELETE PHI    │
    │  • user_id (who changed it)     │
    │  • change_type (CREATE/UPDATE)  │
    │  • old_values / new_values      │
    │  • timestamp                    │
    └────────┬────────────────────────┘
             │
    ┌────────▼──────────────┐
    │  D12: audit_log      │
    │  ┌──────────────────┐ │
    │  │ id               │ │
    │  │ event_id         │ │
    │  │ table_name       │ │
    │  │ record_id        │ │
    │  │ user_id          │ │
    │  │ org_id           │ │
    │  │ action           │ │
    │  │ old_values       │ │
    │  │ new_values       │ │
    │  │ ip_address       │ │
    │  │ timestamp        │ │
    │  └──────────────────┘ │
    └───────────────────────┘

# RevClear Process Flow Chart

**Last Updated:** February 14, 2026  
**System:** AI-Assisted Medical Claims & Speech Transcription Platform

---

## 🔄 End-to-End Process Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    REVCLEAR - COMPLETE PROCESS FLOW                         │
└─────────────────────────────────────────────────────────────────────────────┘

                              START
                                │
                                ▼
                    ┌──────────────────────┐
                    │   Clinician Login    │
                    │   (AWS Cognito)      │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼──────────┐
                    │ Valid Credentials?  │
                    └──────┬─────┬────────┘
                           │ No  │
                    ┌──────▼─┐   │
                    │  Error │   │
                    └────────┘   │
                                 │ Yes
                    ┌────────────▼────────────┐
                    │  JWT Token Issued       │
                    │  (AuthContext stored)   │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  Dashboard Load         │
                    │  (Organization view)    │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
      ┌─────────────┤  Select Action          │
      │             └────┬──┬───┬────┬───┬──┐ │
      │                  │  │   │    │   │  │ │
      │  ┌────────────┬──┘  │   │    │   │  └─┤ New Encounter
      │  │            │     │   │    │   │    │
      ▼  ▼            ▼     ▼   ▼    ▼   ▼    │
    View Manage    View   Create Patient View │
    Claims Users Audio   Task Records Claims  │
      │    │       │      │     │      │      │
      │    │       │      │     │      └──────┤ (Exit to Reports)
      │    │       │      │     │
      │    │       │      │     └──────────────┤ (Patient lookup)
      │    │       │      │
      │    │       │      └──────────────────┐
      │    │       │                         │
      │    │       └─────────────────────────┼─────────────┐
      │    │                                 ▼             │
      │    │                      ┌───────────────────┐   │
      │    │                      │ New Encounter     │   │
      │    │                      │ Wizard            │   │
      │    │                      └───┬───────────────┘   │
      │    │                          │                   │
      │    │              ┌───────────▼──────────────┐   │
      │    │              │  Select Patient          │   │
      │    │              │  (Existing or New)       │   │
      │    │              └───┬────────────────────┐ │   │
      │    │                  │ (First-time user) │ │   │
      │    │                  ▼                   │ │   │
      │    │         ┌──────────────────┐         │ │   │
      │    │         │ Create Patient    │         │ │   │
      │    │         │ • Name, DOB, MRN │         │ │   │
      │    │         │ • Insurance info  │         │ │   │
      │    │         └──┬────────────────┘         │ │   │
      │    │            │                         │ │   │
      │    │            └─────────────┬───────────┘ │   │
      │    │                          │             │   │
      │    │              ┌───────────▼──────────────┐   │
      │    │              │  Confirm Patient Details  │   │
      │    │              └───┬────────────────────┐ │   │
      │    │                  │ (Looks good?)      │ │   │
      │    │         ┌────────▼────────────────┐  │ │   │
      │    │         │ Ask to Correct?        │  │ │   │
      │    │         │ No ──────────┐  Yes ───┼──┘ │   │
      │    │         └──────────────┘         │    │   │
      │    │                                  ▼    │   │
      │    │               ┌──────────────────────┐ │   │
      │    │               │ Edit Patient Fields  │ │   │
      │    │               └──┬───────────────────┘ │   │
      │    │                  │                     │   │
      │    │                  └─────────┬───────────┘   │
      │    │                            │               │
      │    │              ┌─────────────▼──────────────┐│
      │    │              │ Encounter Details         ││
      │    │              │ • Date/time               ││
      │    │              │ • Facility                ││
      │    │              │ • Type (new/est patient)  ││
      │    │              └──┬────────────────────────┘│
      │    │                 │                         │
      │    │              ┌──▼────────────────────┐   │
      │    │              │ Ready to Record?      │   │
      │    │              │ Yes ─────────────────┼────┘
      │    │              └─────────────────────┘
      │    │                                  │
      │    │                    ┌─────────────▼──────────────┐
      │    │                    │ Audio Recording/Upload     │
      │    │                    │ • Record audio OR          │
      │    │                    │ • Upload MP3/WAV file      │
      │    │                    └──┬─────────────────────────┘
      │    │                       │
      │    └───────────────────────┼──┐ (Manage Users)
      │                            │  │
      │    ┌───────────────────────┘  │
      │    │                          │
      │    │   ┌──────────────────────▼─────────────────┐
      │    │   │ Validate Audio                         │
      │    │   │ • File type (WAV/MP3)                  │
      │    │   │ • File size (<500MB)                   │
      │    │   │ • Duration (>30sec recommended)        │
      │    │   └──┬────────────────────────────────────┘
      │    │      │
      │    │   ┌──▼────────────────┐
      │    │   │ Valid?             │
      │    │   ├─ No ──────────┐    │
      │    │   └─ Yes ────────┼────┘
      │    │                  │
      │    │         ┌────────▼─────┐
      │    │         │ Show Error    │
      │    │         │ Re-upload?    │
      │    │         │ Yes ──────┬───┤ No → Return to
      │    │         └───────────┘   │    Selection
      │    │                         │
      │    └─────────────────────────┘
      │                  │
      │    ┌─────────────▼──────────────────────────┐
      │    │ Upload to S3 (Encrypted, AES-256)      │
      │    │ POST /api/transcribe                   │
      │    │ • Multipart form upload                │
      │    │ • Return S3 path + encounter ID        │
      │    └──┬─────────────────────────────────────┘
      │       │
      │    ┌──▼────────────────────────────────────┐
      │    │ Log Audio Record in DB                │
      │    │ INSERT audio_records table            │
      │    │ • S3 path                             │
      │    │ • User ID                             │
      │    │ • Encounter ID                        │
      │    │ • Organization ID                     │
      │    │ • Upload timestamp                    │
      │    └──┬───────────────────────────────────┘
      │       │
      │    ┌──▼────────────────────────────────────┐
      │    │ Show Upload Progress                  │
      │    │ "Transcribing your audio..."          │
      │    └──┬───────────────────────────────────┘
      │       │
      │    ┌──▼────────────────────────────────────────────┐
      │    │ ASYNC: Whisper Transcription                 │
      │    │ Python Service: /transcribe endpoint         │
      │    │ • Download audio from S3                     │
      │    │ • Run Faster Whisper model                   │
      │    │ • Extract text + confidence score            │
      │    └──┬─────────────────────────────────────────┐ │
      │    │ │                     │                   │ │
      │    │ │              ┌──────▼──────┐            │ │
      │    │ │              │ Transcription
      │    │ │              │ Complete      │            │ │
      │    │ │              └──┬───────────┘            │ │
      │    │ │                 │                        │ │
      │    │ │              ┌──▼──────────────────────┐ │ │
      │    │ │              │ Store in ai_results    │ │ │
      │    │ │              │ • transcript text      │ │ │
      │    │ │              │ • confidence_score     │ │ │
      │    │ │              │ • created_at           │ │ │
      │    │ │              └──┬────────────────────┘ │ │
      │    │ │                 │                      │ │
      │    │ │                 │ CALLBACK WEBHOOK     │ │
      │    │ │                 └──────────────────────┘ │
      │    │ │                       │                   │
      │    │ └───────────────────────┼────────────────┘  │
      │    │                         │                   │
      │    │           ┌─────────────▼──────────────────┐
      │    │           │ Poll for Transcript            │
      │    │           │ GET /api/encounters/:id/transcript
      │    │           └──┬────────────────────────────┘
      │    │              │ (Ready?)
      │    │       ┌──────┴───────┐
      │    │       │ No (retry)   │ Yes
      │    │       └──────┬───────┘
      │    │              │
      │    │              ▼
      │    │   ┌──────────────────────────────────────┐
      │    │   │ Display Transcript                   │
      │    │   │ • Read-only transcript view          │
      │    │   │ • Show confidence score              │
      │    │   │ • Option to edit/correct             │
      │    │   │ • Option to regenerate SOAP          │
      │    │   └──┬──────────────────────────────────┘
      │    │      │
      │    │   ┌──▼──────────────────┐
      │    │   │ Edit Transcript?    │
      │    │   │ Yes ─────────┬──┐   │
      │    │   │ No          │  │───┤ (proceed)
      │    │   └─────────────┘  │   │
      │    │        │           │   │
      │    │        ▼           │   │
      │    │   ┌────────────────┴─┐ │
      │    │   │ Edit Text Modal  │ │
      │    │   │ Save Changes?    │ │
      │    │   │ Yes ───────────┬─┘ │
      │    │   └────────────────┘   │
      │    │                        │
      │    │       ┌────────────────▼──────────┐
      │    │       │ Update ai_results row     │
      │    │       │ UPDATE transcript text    │
      │    │       └──┬─────────────────────┐ │
      │    │          │                     │ │
      │    │          └─────────────────────┼─┘
      │    │                                │
      │  ┌─┴──────────────────────────────────┐
      │  │                                    │
      ▼  ▼
    ┌────────────────────────────────────────────────────────┐
    │ SPEECH TO SOAP GENERATION                              │
    │ POST /api/encounters/:id/soap                          │
    └──┬─────────────────────────────────────────────────────┘
       │
    ┌──▼──────────────────────────────────────────────┐
    │ Verify Encounter + Transcript                   │
    │ • Check auth (user org membership)              │
    │ • Fetch transcript from ai_results              │
    │ • Validate transcript exists                    │
    └──┬──────────────────────────┬────────────────┐ │
       │ (Valid?)                 │                │ │
    ┌──▼──────┐              ┌────▼────┐          │ │
    │ Error   │              │ Proceed  │          │ │
    │ Response│              └────┬─────┘          │ │
    └─────────┘                   │                │ │
                   ┌──────────────▼────────────────┐ │
                   │ Call Genkit Flow              │ │
                   │ speechToSoap (Gemini 2.5)    │ │
                   │ Input: transcript            │ │
                   │ Prompt: Extract SOAP format  │ │
                   │ Temp: 0.3                    │ │
                   └──┬────────────────────────────┘ │
                      │                              │
                   ┌──▼────────────────────────────┐ │
                   │ Parse LLM Response            │ │
                   │ • Subjective                  │ │
                   │ • Objective                   │ │
                   │ • Assessment                  │ │
                   │ • Plan                        │ │
                   └──┬──────────────────────────┐ │
                      │                          │ │
                   ┌──▼────────────────────────┐ │ │
                   │ Encrypt SOAP Note         │ │ │
                   │ (AES-256 via KEK)         │ │ │
                   └──┬──────────────────────┐ │ │
                      │                      │ │ │
                   ┌──▼──────────────────────┐ │ │
                   │ Store in ai_results     │ │ │
                   │ • encrypted soap_note   │ │ │
                   │ • model: gemini-2.5     │ │ │
                   │ • tokens_used           │ │ │
                   │ • created_at            │ │ │
                   └──┬───────────────────────┘ │
                      │                         │
                      └─────────────┬───────────┘
                                    │
                                    ▼
                   ┌────────────────────────────────┐
                   │ Display SOAP Note              │
                   │ (Frontend decrypts for display)│
                   │ • Read-only sections           │
                   │ • Edit option                  │
                   │ • Copy/export option           │
                   │ • Proceed to codes             │
                   └──┬──────────┬─────────────────┘
                      │ Edit      │ Proceed
                      │ (regen)   │
                      │           │
                   ┌──▼───────────┴──────┐
                   │ Edit SOAP Modal?    │
                   │ Yes ──────────┐ No  │
                   └──┬────────────┤     │
                      │            │     │
                      ▼            │     │
                  (Regenerate) ◄──┘     │
                      │                 │
                      └────────┬────────┘
                               │
                ┌──────────────▼────────────────────┐
                │ SOAP TO CODES GENERATION          │
                │ POST /api/encounters/:id/codes    │
                └──┬───────────────────────────────┘
                   │
                ┌──▼──────────────────────────────┐
                │ Verify Encounter + SOAP          │
                │ • Check auth                     │
                │ • Fetch SOAP note                │
                │ • Decrypt (if needed)            │
                └──┬──────────────────┬────────────┐
                   │ (Valid?)         │            │
                ┌──▼──────┐      ┌────▼────┐      │
                │ Error   │      │ Proceed  │      │
                │ Response│      └────┬─────┘      │
                └─────────┘           │            │
                       ┌──────────────▼────────────┐
                       │ Load Medical Code Sets    │
                       │ • ICD-10 diagnosis codes  │
                       │ • CPT procedure codes     │
                       │ • Modifiers (if any)      │
                       └──┬───────────────────────┘
                          │
                       ┌──▼────────────────────────┐
                       │ Call Genkit Flow          │
                       │ soapToCodes (Gemini 2.5)  │
                       │ Inputs:                   │
                       │ • SOAP note               │
                       │ • Code sets               │
                       │ Prompt: Match codes       │
                       │ Temp: 0.2 (deterministic) │
                       └──┬──────────────────────┐ │
                          │                      │ │
                       ┌──▼────────────────────┐ │ │
                       │ Parse Code Response   │ │ │
                       │ • ICD-10 codes        │ │ │
                       │ • CPT codes           │ │ │
                       │ • Confidence scores   │ │ │
                       │ • Descriptions        │ │ │
                       └──┬──────────────────┐ │ │
                          │                  │ │ │
                       ┌──▼──────────────────┐ │ │
                       │ Validate Codes      │ │ │
                       │ • Check code format │ │ │
                       │ • Verify valid code │ │ │
                       │ • Check bundling    │ │ │
                       │   rules             │ │ │
                       │ • Compliance check  │ │ │
                       └──┬────────────────┐ │ │
                          │                │ │ │
                       ┌──▼────────────────┐ │ │
                       │ Store Codes       │ │ │
                       │ INSERT medical_  │ │ │
                       │ codes table       │ │ │
                       │ • soap_result_id  │ │ │
                       │ • code_type       │ │ │
                       │ • code value      │ │ │
                       │ • confidence      │ │ │
                       │ • verified: false │ │ │
                       │ (default)         │ │ │
                       └──┬───────────────┘ │
                          │                 │
                          └────────┬────────┘
                                   │
                       ┌───────────▼──────────────┐
                       │ Display Medical Codes    │
                       │ • ICD-10 list            │
                       │ • CPT list               │
                       │ • Confidence scores      │
                       │ • Markup missing codes   │
                       │ • Edit/add codes option  │
                       │ • Verify codes checkbox  │
                       └──┬──────┬───────────────┘
                          │ Edit  │ Verified
                          │       │
                    ┌─────▼───┐ ┌─▼──────┐
                    │ (Manual │ │ Update │
                    │  adjust)│ │ verified│
                    └────┬────┘ └──┬─────┘
                         │         │
                         └────┬────┘
                              │
                ┌─────────────▼──────────────────────┐
                │ CLAIM GENERATION                   │
                │ POST /api/claims                   │
                └──┬────────────────────────────────┘
                   │
                ┌──▼──────────────────────────────┐
                │ Determine Claim Type             │
                │ • Provider settings              │
                │   - Professional → CMS-1500      │
                │   - Institutional → UB-04        │
                └──┬──────────────┬────────────────┐
                   │ (Type?)      │                │
                ┌──▼─────┐  ┌─────▼────┐          │
                │ Prof   │  │ Instit.  │          │
                │(1500)  │  │ (UB-04)  │          │
                └──┬─────┘  └──┬──────┘           │
                   │           │                   │
                   └────┬───────┘                  │
                        │
                ┌───────▼──────────────────────┐
                │ Fetch Encounter + Related    │
                │ • Encounter details          │
                │ • Patient demographics       │
                │ • Clinician/provider info    │
                │ • Medical codes              │
                │ • Insurance information      │
                └──┬───────────────────────────┘
                   │
                ┌──▼───────────────────────────┐
                │ Populate Claim Fields        │
                │ CMS-1500:                    │
                │ • Insured/patient info       │
                │ • Physician info             │
                │ • Claim dates                │
                │ • Service description        │
                │ • Diagnosis codes (ICD-10)   │
                │ • Procedures (CPT)           │
                │ • Charges                    │
                │ • Insurance info             │
                │ • Prior auth references      │
                │                              │
                │ UB-04:                       │
                │ • Institution info           │
                │ • Patient admission/disch    │
                │ • Providers                  │
                │ • Condition codes            │
                │ • Service lines              │
                │ • Revenue codes              │
                │ • Charges                    │
                └──┬────────────────────────┐ │
                   │                        │ │
                ┌──▼────────────────────────┐ │
                │ Validate Claim Fields     │ │
                │ • Required fields filled  │ │
                │ • Valid code formats      │
                │ • Bundling compliance     │
                │ • Charges > 0             │
                │ • No conflicting codes    │
                └──┬──────────────┬────────┘ │
                   │ (Valid?)     │          │
                ┌──▼──┐       ┌───▼────┐    │
                │Error│       │ Proceed │    │
                │List │       └────┬────┘    │
                └─────┘            │         │
                   │               │         │
                   └───────┬───────┘         │
                           │                 │
                    ┌──────▼──────────────┐  │
                    │ Encrypt Claim Data  │  │
                    │ (AES-256)           │  │
                    └──┬─────────────────┘  │
                       │                    │
                    ┌──▼──────────────────┐ │
                    │ Store in claims DB  │ │ │
                    │ • All fields        │ │ │
                    │ • status: "draft"   │ │ │
                    │ • created_at        │ │ │
                    │ • approval_status   │ │ │
                    └──┬─────────────────┘ │
                       │                  │ │
                       └──────────────────┼─┘
                                          │
                       ┌──────────────────▼──────────────┐
                       │ Display Claim for Review        │
                       │ • Show formatted claim          │
                       │ • CMS-1500 / UB-04 preview      │
                       │ • Highlight required fields     │
                       │ • Highlight warnings           │
                       │ • Required to fix: In red       │
                       │ • Warnings (review): In yellow  │
                       │ • All good: In green            │
                       │ • Edit option                   │
                       │ • Save and review later (draft) │
                       │ • Approve and submit            │
                       └──┬───────┬───────────┬──────────┘
                          │ Edit  │ Draft    │ Approve
                          │       │          │
                    ┌─────▼──┐  │         ┌──▼────────┐
                    │ Edit   │  │         │ Submit?   │
                    │ Modal  │  │         │ Confirm   │
                    │ Update │  │         │ Yes ──┐   │
                    │ Claim  │  │         └───────┤   │
                    └────┬───┘  │               No│   │
                         │      │                 │   │
                         │      └───────┬─────────┘   │
                         │              │             │
                         └──────┬───────┘             │
                                │                    │
                ┌───────────────▼──────────────────┐  │
                │ Update status: "pending_submit"   │  │
                │ (Audit log entry)                │  │
                └──┬────────────────────────────┐  │  │
                   │                            │  │  │
                   │  ┌──────────────────────────┴──┘  │
                   │  │  ┌─────────────────────────────┴─┘
                   │  │  │
                   ▼  ▼  ▼
            ┌────────────────────────────────────────┐
            │ EDI SUBMISSION & CLAIMS SUBMISSION      │
            │ POST /api/claims/:id/submit             │
            └──┬─────────────────────────────────────┘
               │
            ┌──▼──────────────────────────────────┐
            │ Verify Submission Authority         │
            │ • User must be clinician/admin      │
            │ • Claim status = pending_submit     │
            │ • All required fields present       │
            └──┬──────────────────┬───────────────┐
               │ (Valid?)         │               │
            ┌──▼──┐           ┌───▼────┐         │
            │Error│           │ Proceed │         │
            │ Msg │           └────┬────┘         │
            └─────┘                │              │
                            ┌──────▼────────────┐
                            │ Format Claim as   │
                            │ EDI X12 837       │
                            │ • Header segment  │
                            │ • Patient segment │
                            │ • Diagnosis seg   │
                            │ • Service lines   │
                            │ • NM1 segments    │
                            │ • CLM segment     │
                            │ • Trailer segment │
                            └──┬────────────────┘
                               │
                            ┌──▼──────────────────┐
                            │ Encrypt EDI File    │
                            │ + Sign (SFTP keys)  │
                            └──┬─────────────────┘
                               │
                            ┌──▼──────────────────────┐
                            │ Transmit to Payer/      │
                            │ Clearinghouse           │
                            │ Method:                 │
                            │ • SFTP (secure)         │
                            │ • or HTTPS API endpoint │
                            │ Retry logic (3 attempts)│
                            └──┬────────────────────┐ │
                               │                    │ │
                            ┌──▼────────────────────┐ │
                            │ Log Transmission      │ │
                            │ INSERT edi_batches    │ │
                            │ • transmission_id     │ │
                            │ • edi_file (X12)      │ │
                            │ • sent_at             │ │
                            │ • recipient           │ │
                            │ • status: submitted   │ │
                            └──┬──────────────────┐ │
                               │                  │ │
                               └───────┬──────────┘ │
                                       │            │
                        ┌──────────────▼───────────┐
                        │ Update Claim Status      │
                        │ "submitted"              │
                        │ Create audit log entry   │
                        └──┬──────────────────────┘
                           │
                        ┌──▼──────────────────────────┐
                        │ Show Confirmation to User  │
                        │ • Transmission ID          │
                        │ • Recipient               │
                        │ • Submission timestamp     │
                        │ • Next steps (wait for 999)│
                        │ • View claim status option │
                        └──┬───────────────────────┬┘
                           │ View status        Done│
                           │                        │
                    ┌──────▼────┐                   │
                    │ Claims    ├─────┐             │
                    │ Dashboard │     │ (goto dash) │
                    └───────────┘     │             │
                                      │             │
                            ┌─────────┴──────┐      │
                            │                │      │
                            │    ┌───────────┴─┐    │
                            │    │             │    │
                            ▼    ▼             ▼    │
                      ┌──────────────────────┐     │
                      │ ASYNC: Wait for EDI  │     │
                      │ Response (999/997)   │     │
                      └──┬─────────────────┐ │     │
                         │                 │ │     │
                      ┌──▼───────────────┐ │ │     │
                      │ Poll Payer Email/│ │ │     │
                      │ API Endpoint     │ │ │     │
                      │ (every 1 hour)   │ │ │     │
                      └──┬──────────────┐ │ │     │
                         │ (Response?)  │ │ │     │
                    ┌────▼────┬────────┘ │ │     │
                    │No (retry)│          │ │     │
                    │          Yes        │ │     │
                    │          │          │ │     │
                    ▼          ▼          │ │     │
                  Wait    ┌───────────────┐ │     │
                  1hour   │ 999 Error?    │ │     │
                          │ (Parse error) │ │     │
                          └──┬────────┬─┬─┘ │     │
                             │ Yes    │ No │ │     │
                        ┌────▼────┐ ┌▼────▼─┴─┐   │
                        │ Manual  │ │ 997     │   │
                        │ review/ │ │ Error?  │   │
                        │ resubmit│ │ Validat │   │
                        └────┬────┘ └──┬────┬─┴─┐ │
                             │         │Yes │ No│ │
                             │    ┌────▼─┐ ┌▼──▼─┘ │
                             │    │Manual│ │Accepted
                             │    │fix   │ │(999/997
                             │    │resubm│ │ ok)
                             │    └────┬─┘ └─┬───┘
                             │         │     │
                             └────┬────┴─────┘
                                  │
                        ┌─────────▼──────────────┐
                        │ Log EDI Response       │
                        │ INSERT edi_responses   │
                        │ • batch_id             │
                        │ • response_code        │
                        │ • error_details        │
                        │ • received_at          │
                        └──┬─────────────────────┘
                           │
                        ┌──▼──────────────────────┐
                        │ Update Claim Status     │
                        │ Based on Response:      │
                        │ • 999 error → pending   │
                        │ • 997 error → pending   │
                        │ • Accepted → submitted  │
                        │ • Notify clinician      │
                        └──┬───────────────────┐ │
                           │                   │ │
                           └─────────┬─────────┘ │
                                     │           │
                           ┌─────────▼──────────┐
                           │ CLAIMS MONITORING   │
                           │ Track claim status  │
                           │ • Pending validation│
                           │ • Rejected          │
                           │ • Paid              │
                           │ • Denied            │
                           │ View detailed status│
                           └────────┬────────────┘
                                    │
                           ┌────────▼─────────┐
                           │ Return to        │
                           │ Dashboard        │
                           └──────────────────┘
