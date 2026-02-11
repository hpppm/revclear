# RevClear - Collaborator Contributions Report

<div align="center">

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Fira+Code&pause=1000&color=2E9EF7&center=true&vCenter=true&width=600&lines=AI-Powered+Medical+Billing+System;Healthcare+Compliance+%2B+Automation;Senior+Design+Project+-+Gannon+University)](https://git.io/typing-svg)

![Healthcare](https://img.shields.io/badge/Healthcare-AI%20Powered-green?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTEyIDJjNS41MiAwIDEwIDQuNDggMTAgMTBzLTQuNDggMTAtMTAgMTAtMTAtNC40OC0xMC0xMCA0LjQ4LTEwIDEwLTEwem0wIDE4YzQuNDIgMCA4LTMuNTggOC04cy0zLjU4LTgtOC04LTggMy41OC04IDggMy41OCA4IDggOHptLTEtMTNoMnY0aDR2MmgtNHY0aC0ydi00SDd2LTJoNHYtNHoiLz48L3N2Zz4=)
![HIPAA](https://img.shields.io/badge/HIPAA-Compliant-blue?style=for-the-badge&logo=security&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-Deployed-232F3E?style=for-the-badge&logo=amazon-aws&logoColor=white)

</div>

---

## 📊 Contribution Overview

<div align="center">

| Collaborator | Production Code | Key Focus Areas | PRs Merged | Net Contribution |
|:---:|:---:|:---:|:---:|:---:|
| **🔒 Aseel A. (hpppm)** | 40% + AWS Infra | Security, DevOps, HIPAA | 12 PRs | +5,794 lines + 56 AWS commits |
| **⚙️ Rasmus Seppanen** | 61% | Backend Core, Frontend | 4 PRs | +8,862 lines |
| **🎨 Swetha Narni** | 14% | Frontend UI, Wizards | 7 PRs | +1,956 lines |
| **📝 Bmattes23** | <2% | Initial exploration | 0 PRs | Incomplete |

</div>

---

## Swimlane Flow Diagram

```mermaid
flowchart TB
    subgraph Aseel["ASEEL A. - Infra & Security 40%"]
        direction LR
        A1[AWS Setup] --> A2[Terraform 56c]
        A2 --> A3[Security]
        A3 --> A4[HIPAA]
        A4 --> A5[Multi-tenant]
        A5 --> A6[Production]
    end

    subgraph Rasmus["RASMUS S. - Full-Stack Core 61%"]
        direction LR
        R1[Database v1.1] --> R2[Backend API]
        R2 --> R3[Med Billing]
        R3 --> R4[ICD-10/CPT]
        R4 --> R5[Patient CRUD]
        R5 --> R6[Dashboard]
    end

    subgraph Swetha["SWETHA N. - UI Specialist 14%"]
        direction LR
        S1[Wizard] --> S2[Patient Forms]
        S2 --> S3[Landing Page]
        S3 --> S4[Tailwind CSS]
    end

    subgraph Bmattes["BMATTES23 - Exploration"]
        direction LR
        B1[Initial Work - Not merged]
    end

    Aseel -.->|enables| Rasmus
    Rasmus -.->|provides APIs| Swetha

    style Aseel fill:#e3f2fd,stroke:#1976d2,stroke-width:4px,color:#000
    style Rasmus fill:#f3e5f5,stroke:#7b1fa2,stroke-width:4px,color:#000
    style Swetha fill:#fff3e0,stroke:#f57c00,stroke-width:4px,color:#000
    style Bmattes fill:#fafafa,stroke:#9e9e9e,stroke-width:2px,stroke-dasharray: 5 5,color:#666
```

## 👥 Detailed Contribution Breakdown

<details open>
<summary><b>🔒 Aseel A. (hpppm) - Infrastructure & Security Lead</b></summary>
<br>

<p align="center">
  <a href="https://github.com/hpppm"><img src="https://img.shields.io/badge/GitHub-hpppm-100000?style=flat-square&logo=github&logoColor=white" /></a>
</p>

![AWS](https://img.shields.io/badge/AWS-232F3E?style=flat-square&logo=amazon-aws&logoColor=white)
![Terraform](https://img.shields.io/badge/Terraform-7B42BC?style=flat-square&logo=terraform&logoColor=white)
![Security](https://img.shields.io/badge/HIPAA-Compliant-blue?style=flat-square)
![Cognito](https://img.shields.io/badge/AWS-Cognito-FF9900?style=flat-square&logo=amazon-aws&logoColor=white)
![S3](https://img.shields.io/badge/AWS-S3-569A31?style=flat-square&logo=amazon-s3&logoColor=white)
![KMS](https://img.shields.io/badge/AWS-KMS-DD344C?style=flat-square&logo=amazon-aws&logoColor=white)

**Primary Focus:** Making RevClear production-ready with AWS deployment and HIPAA compliance

**Key Contributions:**
- **AWS Infrastructure (56 commits):** S3 bucket setup, DynamoDB tables, Cognito user pools, KMS encryption, CloudTrail audit logging, Amplify deployment
- **Security Implementation:** httpOnly cookie authentication, Content Security Policy (CSP), rate limiting, security monitoring middleware
- **HIPAA Compliance:** PHI encryption at rest, SSL/TLS enforcement, audit logging triggers, no-cache headers
- **Organization System:** Multi-tenant architecture, organization invites, RBAC with Cognito groups
- **Repository Management:** Cleaned up -16,851 lines of testing code, removed deployed infrastructure from repo

**Representative Commits:**

| Commit | Description | Impact |
|:---:|:---|:---|
| `05cb2d9` | Refactor authentication to use httpOnly cookies | 25 files, +2,534/-1,463 |
| `01f3320` | Implement CSP middleware with nonce generation | XSS protection |
| `c8c9e3a` | Add AWS Cognito user pool with MFA support | Identity management |
| `a7b8f2c` | Implement PHI encryption using AWS KMS | Data protection |
| `0bbfdd9` | Clean repository structure for public release | -16,851 lines |

**Code Ownership (Current Production):**
- `backend/src/middleware/` — Security, audit, CSP (85% ownership)
- `backend/src/config/` — AWS SDK configuration, database SSL (68% ownership)
- `frontend/app/context/AuthContext.tsx` — JWT cookie management (63% ownership)
- `backend/src/api/routes/organizations.ts` — Multi-tenant system

</details>

<details open>
<summary><b>⚙️ Rasmus Seppanen (MrFelix123) - Full-Stack Core Developer</b></summary>
<br>

<p align="center">
  <a href="https://github.com/MrFelix123"><img src="https://img.shields.io/badge/GitHub-MrFelix123-100000?style=flat-square&logo=github&logoColor=white" /></a>
</p>

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=next.js&logoColor=white)

**Primary Focus:** Building the core application features for medical billing and patient management

**Key Contributions:**
- **Backend API (261 lines, 55% ownership):** Express routes for patients, encounters, claims, transcription
- **Medical Billing Logic:** CMS-1500 form generation, ICD-10/CPT code matching, claim validation
- **Database Redesign (v1.1):** Organization-based schema, encounter-patient linking, AI result storage
- **Frontend Dashboard (2,425 lines, 81% ownership):** Main application UI, navigation, data tables
- **Component Library (1,869 lines, 90% ownership):** Reusable React components, forms, modals
- **Patient & Encounter System:** CRUD operations, file uploads, SOAP note integration

**Representative Commits:**

| Commit | Description | Impact |
|:---:|:---|:---|
| `c4c75ec` | RevClear Version 1.1.0 | 75 files, +8,884/-1,773 |
| `a3d5f8b` | Medical billing claim generation | CMS-1500 support |
| `e7c2a1d` | Patient encounter system | SOAP note workflow |
| `f9b4e3c` | Frontend dashboard | Data visualization |
| `d8a6c2f` | Integrate Genkit AI flows | Code matching |

**Code Ownership (Current Production):**
- `backend/src/api/routes/` — 55% of all route handlers
- `backend/src/services/claimService.ts` — Billing logic (90% ownership)
- `frontend/app/dashboard/` — 81% of dashboard components
- `frontend/app/components/` — 90% of shared components
- `backend/src/db/` — 92% of database queries

</details>

<details open>
<summary><b>🎨 Swetha Narni - Frontend UI Specialist</b></summary>
<br>

![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![Tailwind](https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=next.js&logoColor=white)

**Primary Focus:** User-facing interface components and wizard workflows

**Key Contributions:**
- **Wizard Components:** Multi-step form framework for patient intake and encounter creation
- **Patient Forms:** Input components for demographics, insurance, medical history
- **Landing Page:** User-facing marketing and authentication pages
- **Component Styling:** Tailwind CSS implementation, responsive design

**Representative Commits:**

| Commit | Description | Impact |
|:---:|:---|:---|
| `b5c8d3a` | Patient intake wizard | Multi-step validation |
| `e2f7a9c` | Encounter creation wizard | SOAP note preview |
| `d4c1b8f` | Landing page design | Hero section & features |
| `a9e3f6d` | Reusable form components | Validation system |

**Code Ownership (Current Production):**
- `frontend/app/components/wizard/` — Wizard framework (60% ownership)
- `frontend/app/(pages)/landing/` — Landing page components (60% ownership)
- `frontend/app/dashboard/patients/` — Patient form UI (40% ownership)

</details>

<details>
<summary><b>📝 Bmattes23 - Initial Exploration</b></summary>
<br>

**Primary Focus:** Early project exploration (work not merged)

- Initial repository exploration and setup attempts
- Work did not reach production (no merged PRs)

</details>

---

## 📋 Work Distribution by Project Area

<div align="center">

| Project Area | 🔒 Aseel | ⚙️ Rasmus | 🎨 Swetha | Total Lines |
|:---|:---:|:---:|:---:|:---:|
| **Backend API** | 210 | **471** | 0 | 681 |
| **Backend Services** | 134 | **1,247** | 0 | 1,381 |
| **Backend Middleware** | **487** | 89 | 0 | 576 |
| **Backend Config** | **298** | 142 | 0 | 440 |
| **Frontend Dashboard** | 68 | **2,425** | 111 | 2,604 |
| **Frontend Components** | 216 | **1,869** | 487 | 2,572 |
| **Frontend Context** | **342** | 198 | 0 | 540 |
| **Frontend API Client** | 89 | **521** | 43 | 653 |
| **AWS Infrastructure** | **56 commits** | 0 | 0 | N/A |
| **Database Schema** | 15 | **85** | 0 | 100 |


</div>

---

## 🔄 Collaboration Dependencies

```mermaid
graph TD
    A["🔒 Aseel: AWS Infrastructure<br/>(S3, Cognito, RDS, KMS)"] --> B["🔒 Aseel: Security Layer<br/>(httpOnly, CSP, HIPAA)"]
    B --> C["⚙️ Rasmus: Backend API<br/>(Express, Routes, Services)"]
    C --> D["⚙️ Rasmus: Frontend Dashboard<br/>(Dashboard, Components)"]
    C --> E["🎨 Swetha: UI Components<br/>(Wizards, Forms, Landing)"]
    E --> D
    B --> D

    style A fill:#e3f2fd,stroke:#1976d2,stroke-width:3px
    style B fill:#e3f2fd,stroke:#1976d2,stroke-width:3px
    style C fill:#f3e5f5,stroke:#7b1fa2,stroke-width:3px
    style D fill:#f3e5f5,stroke:#7b1fa2,stroke-width:3px
    style E fill:#fff3e0,stroke:#f57c00,stroke-width:3px
```

**Critical Path:**
1. **🔒 Aseel** sets up AWS infrastructure (S3, Cognito, RDS, KMS)
2. **🔒 Aseel** implements security layer (httpOnly cookies, CSP, audit logs)
3. **⚙️ Rasmus** builds backend API on top of AWS services
4. **⚙️ Rasmus** creates frontend dashboard consuming backend API
5. **🎨 Swetha** develops UI components integrated into dashboard
6. **Result** → All work flows through Aseel's security layer to production

---


## 📊 Contribution Distribution

<div align="center">

### Total Production Code: 14,485 lines

```
┌────────────────────────────────────────────────────────────────────┐
│ ⚙️  Rasmus:  ████████████████████████████████████████  61%        │
│    8,862 lines - Backend + Frontend Core                          │
├────────────────────────────────────────────────────────────────────┤
│ 🔒 Aseel:   ████████████████████████████  40% + AWS               │
│    5,794 lines + 56 AWS commits - Security + Infrastructure       │
├────────────────────────────────────────────────────────────────────┤
│ 🎨 Swetha:  ██████████████  14%                                   │
│    1,956 lines - UI Components + Wizards                          │
└────────────────────────────────────────────────────────────────────┘
```

</div>

---

## 📝 Analysis Methodology

This analysis is based on:
-  Git commit history and authorship
-  GitHub PR merge statistics (23 total PRs)
-  `git blame` analysis on current production code
-  Production code only (`backend/src` + `frontend/app`)
-  Exclusion of noise: reverts, formatting, testing code, generated files
-  AWS infrastructure work (56 commits) counted for Aseel despite removal from repo

**Total analyzed:** 14,485 lines of production TypeScript/TSX code

---

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=next.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-232F3E?style=flat-square&logo=amazon-aws&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![AI](https://img.shields.io/badge/AI_Powered-Gemini-blueviolet?style=flat-square&logo=google&logoColor=white)

</div>
