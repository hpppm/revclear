# 🌐 Frontend Overview

## Developer Guide — AI-Powered Medical Billing System Frontend (Next.js)

### 🩺 1. Purpose

This document describes the technical architecture, key components, and development guidelines for the AI-Powered Medical Billing System's frontend application. It is built with Next.js and designed to provide a secure and intuitive user interface for clinicians.

### 🧩 2. Architecture Overview

#### 🏗️ Stack Summary

| Layer                | Technology                           | Purpose                                             |
| -------------------- | ------------------------------------ | --------------------------------------------------- |
| **Framework**        | Next.js (TypeScript)                 | React framework for building user interfaces        |
| **Styling**          | Tailwind CSS                         | Utility-first CSS framework                         |
| **Authentication**   | Firebase Authentication              | User login, registration, and session management    |
| **API Interaction**  | Axios                                | HTTP client for communicating with the backend API  |
| **Database/Storage** | Supabase (Client-side)               | Client-side interaction with Supabase services      |
| **State Management** | React Context API                    | Global state management (e.g., authentication)      |

#### 🧱 Component Interaction

```mermaid
graph TD
    A[User] --> B[Frontend (Next.js)]
    B -->|Firebase Auth| C[Firebase Authentication]
    B -->|API Calls (Axios)| D[Backend API (Cloud Run)]
    B -->|Supabase Client| E[Supabase (DB/Storage)]
    D -->|Firebase Admin SDK| C
    D -->|Cloud SQL| F[Cloud SQL (Postgres)]
    D -->|Cloud Storage| G[Cloud Storage]
    D -->|Genkit + Vertex AI| H[AI Layer]
```

### ⚙️ 3. Core Responsibilities

*   **User Interface:** Provide a responsive and intuitive interface for clinicians to manage patients, encounters, claims, and review AI-generated data.
*   **Authentication:** Handle user login, registration, and session management securely using Firebase Authentication.
*   **Data Presentation:** Display data fetched from the backend API and Supabase in a clear and organized manner.
*   **Form Handling:** Manage user input for creating and updating records.
*   **Navigation:** Implement client-side routing using Next.js.

### 4. Local Development Setup

For detailed local development setup instructions, refer to the `frontend/TODO.md` file.

### 5. Authentication Flow

1.  User interacts with login/registration forms.
2.  Firebase client SDK handles user authentication (e.g., `signInWithEmailAndPassword`).
3.  Upon successful authentication, Firebase provides an ID token.
4.  This ID token is then included in the `Authorization` header of all subsequent requests to the backend API.
5.  The backend API (Cloud Run) verifies the Firebase ID token using the Firebase Admin SDK.

### 6. API Interaction

The frontend uses `axios` to make HTTP requests to the backend API. The `src/lib/api.ts` file provides an `axios` instance and a `withAuth` helper to include the Firebase ID token in authenticated requests.

### 7. Component Structure

The project follows a standard Next.js application structure:

*   `src/app`: Contains the main application routes and pages (using the App Router).
*   `src/components`: Reusable UI components.
*   `src/context`: React Context providers for global state (e.g., `AuthContext`).
*   `src/lib`: Utility functions and client initializations (e.g., `firebase.ts`, `supabase.ts`, `api.ts`).
*   `src/styles`: Global CSS and Tailwind CSS configuration.

### 8. Deployment

The frontend application is designed to be deployed on platforms like Vercel, which offers seamless integration with Next.js projects. Refer to the `frontend/README.md` for basic deployment information.
