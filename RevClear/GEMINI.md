# 🚀 AI-Powered Medical Billing System - Project Overview

This document provides a high-level overview of the AI-Powered Medical Billing System and the necessary steps to get started with local development.

## About the Project

This project is a full-stack application designed to streamline the medical billing process using Artificial Intelligence. It automates the process of generating medical claims from patient consultations, reducing administrative overhead and improving accuracy.

### Key Features

- **AI-Powered Transcription:** Automatically transcribes audio recordings of patient consultations.
- **Automated SOAP Note Generation:** Generates structured SOAP notes from transcriptions.
- **ICD-10/CPT Code Extraction:** Suggests appropriate medical codes based on the SOAP note.
- **HIPAA-Compliant Architecture:** Built on a secure, HIPAA-compliant Google Cloud architecture.
- **Human-in-the-Loop Validation:** Includes multiple validation gates for human review and approval.

## Getting Started

To get started with local development, you will need to set up both the backend and frontend services.

### Backend Setup

1.  **Navigate to the backend directory:**

    ```bash
    cd backend
    ```

2.  **Create the following files:**

    - `.env`: For environment variables (see `PROJECT_STANDARDS.md` for required variables).
    - `src/config/serviceAccountKey.json`: Your Google Cloud service account key.

3.  **Install dependencies and run the development server:**
    ```bash
    npm install
    npm run dev
    ```

### Frontend Setup

1.  **Navigate to the frontend directory:**

    ```bash
    cd frontend
    ```

2.  **Create the following files:**

    - `.env.local`: For frontend environment variables (e.g., Firebase configuration).

3.  **Install dependencies and run the development server:**
    ```bash
    npm install
    npm run dev
    ```

Once both services are running, you can access the application at `http://localhost:3000`.
