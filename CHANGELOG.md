# Changelog

All notable changes to RevClear will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial public release preparation
- Comprehensive API rate limiting across all endpoints
- Pagination support for list endpoints (patients, encounters, claims, users)
- Security monitoring middleware
- PHI encryption utilities

### Security
- Added authentication to `/api/security/stats` endpoint
- Added authentication to `/api/dev/config` endpoint  
- Rate limiting: `/api/auth` (10/min), `/api/transcribe` (5/min)
- Rate limiting: `/api/patients`, `/api/encounters`, `/api/claims`, `/api/codes` (60/min)
- Rate limiting: `/api/organizations`, `/api/me`, `/api/users` (30/min)
- Rate limiting: `/api/security` (10/min)

### Changed
- List endpoints now return paginated responses with `{ data, pagination }` format
- Dev routes restricted to non-test environments only

## [1.0.0] - 2026-01-08

### Added
- Core platform functionality
- Patient management (CRUD)
- Encounter management with audio transcription
- SOAP note generation via AI (Genkit + Gemini)
- Medical code matching (ICD-10, CPT)
- Claims generation and management
- Organization/multi-tenant support
- AWS Cognito authentication
- AWS S3 file storage
- AWS RDS PostgreSQL database
- Audit logging middleware
- Swagger API documentation

### Security
- HIPAA-compliant data handling
- PHI encryption at rest and in transit
- JWT-based API authentication
- Role-based access control (RBAC)
- AWS KMS encryption
- Security headers via Helmet.js

---

[Unreleased]: https://github.com/your-org/revclear/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/your-org/revclear/releases/tag/v1.0.0
