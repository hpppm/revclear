RevClear – AI-Powered Medical Billing MVP
Overview

RevClear is an academic project that explores the design and development of an AI-powered medical billing system. The goal is to improve claim accuracy, reduce denials, and save time for providers in specialized practices such as Physical Therapy (PT), Mental Health (MH), and optionally Speech-Language Pathology (SLP).

The project focuses on three key stages:

Speech-to-Text (STT): Convert session notes into structured text.

AI Code Suggestion: Recommend CPT/ICD codes based on the documentation.

Claim Validation & Finalization: Run payer checks, flag missing data, and finalize claims for submission.

[!TIP]
Our design is local-first (SQLite + SQLCipher), ensuring data stays secure without relying on third-party APIs.

Success Criteria

 Define MVP structure (STT → Code Suggestion → Validation).

 Collect initial sample data (PT + MH focus).

 Build working MVP with 3 demo stages.

 Test and validate with simulated claim scenarios.

 Gather feedback from early adopters (students, instructors, or pilot users).

[!IMPORTANT]
Success will be measured by improved coding accuracy, higher claim acceptance, and clear provider cost-benefit (time saved + fewer denials).

Secure by Design

Security and compliance are built into the architecture from the start:

 Role-based access (Therapist, Biller, Admin).

 Add authentication & optional 2FA.

 Implement audit logging.

 Encrypt database with SQLCipher.

 Default to “deny access” on failed lookups.

[!WARNING]
Never store raw patient identifiers in logs. Use masking like P****23.

Functional Scope (MVP)

Claim submission (FR1)

AI-powered coding (FR4)

Billing dashboard (FR6)

Secure login and roles (FR9/FR10)

Pre-submission payer validation (FR12)

Audit logging (FR10)

Analytics and exports (FR15)

[!NOTE]
Future enhancements may include voice dictation, SOAP generation, denial ingestion, adaptive learning, and EHR integrations.

Tech Stack

Backend: Python (local-first).

Database: SQLite + SQLCipher.

Version Control: GitHub for collaboration.

AI/ML: Prototype with reinforcement learning for adaptive coding improvements.

Frontend (planned): Lightweight React UI for dashboard.

Team

Aseel Alqoud

Brendan Mattes

Rasmus Seppanen

Yoga Sai Swetha Narni

Supervising Instructor

Dr. Davide Piovesan, Gannon University

License

This repository is for academic purposes under Gannon University. Licensing details will be added based on project needs.
