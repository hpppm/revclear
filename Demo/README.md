# RevClear – AI-Powered Medical Billing MVP
Overview

RevClear is an academic project that explores the design and development of an AI-powered medical billing system. The goal is to improve claim accuracy, reduce denials, and save time for providers in specialized practices such as Physical Therapy (PT), Mental Health (MH), and optionally Speech-Language Pathology (SLP).

The project focuses on three key stages:

Speech-to-Text (STT): Convert session notes into structured text.

AI Code Suggestion: Recommend CPT/ICD codes based on the documentation.

Claim Validation & Finalization: Run payer checks, flag missing data, and finalize claims for submission.

## Success Criteria

A working MVP with the three demo stages (STT → Code Suggestion → Report).

Positive feedback from early adopters (PT/MH/SLP).

Evidence of improved coding accuracy and claim acceptance.

Clear cost-benefit for providers (time saved, reduced denials).

Strong positioning against existing solutions through a unique AI-driven approach.

## Secure by Design

Security and compliance are built into the architecture from the start:

Authentication & Authorization: Role-based access (Therapist, Biller, Admin).

Audit Logging: Immutable logs of claims and user actions.

Encryption: TLS 1.3 for communication, SQLCipher for database storage.

Password Security: Bcrypt for password hashing.

Two-Factor Authentication (2FA): Optional support for added protection.

Fail-Safe Defaults: Deny by default if access checks fail.

## Functional Scope (MVP)

Claim submission

AI-powered coding

Billing dashboard

Secure login and roles

Pre-submission payer validation

Audit logging

Analytics and exports

Future enhancements may include voice dictation, SOAP note generation, denial ingestion, adaptive learning, and integrations with EHRs or clearinghouses.

## Tech Stack

Backend: Python (local-first design, no reliance on external APIs).

Database: SQLite + SQLCipher for encryption.

Version Control: GitHub for collaboration.

AI/ML: Prototype with reinforcement learning for adaptive coding improvements.

Frontend (planned): Lightweight React UI for demo dashboard.

## Team

Aseel Alqoud

Brendan Mattes

Rasmus Seppanen

Yoga Sai Swetha Narni

## Supervising Instructor

Dr. Davide Piovesan, Gannon University

## License

This repository is for academic purposes under Gannon University. Licensing details will be added based on project needs.
