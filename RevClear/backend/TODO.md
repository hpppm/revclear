# Backend Setup TODO List (Firebase Auth + Supabase DB/Storage)

This document outlines the steps to set up and run the backend, utilizing Firebase for authentication and Supabase for database and storage.

## 1. Navigate to the Backend Directory

```bash
cd backend
```

## 2. Install Dependencies

Ensure all necessary Node.js packages are installed:

```bash
npm install
```

## 3. Configure Environment Variables (`backend/.env`)

Edit the `.env` file located in the `backend/` directory to include the following configurations:

### a. Firebase Service Account Key

This is required for the Firebase Admin SDK to verify user tokens.

1.  **Download Service Account Key:**
    *   Go to your Firebase project in the [Firebase console](https://console.firebase.google.com/).
    *   Navigate to "Project settings" (the gear icon) -> "Service accounts".
    *   Click "Generate new private key" and download the JSON file.
2.  **Place Key File:** Place this JSON file in a secure location within your project (e.g., `backend/firebase-service-account.json`).
3.  **Update `.env`:** Update the `FIREBASE_SERVICE_ACCOUNT_KEY_PATH` variable in your `backend/.env` file to the **absolute path** of this JSON file.

    ```
    FIREBASE_SERVICE_ACCOUNT_KEY_PATH=/path/to/your/firebase-service-account.json # Example: /Users/youruser/MedicalSystem/backend/firebase-service-account.json
    ```

### b. Supabase Credentials (for Database and Storage)

If you are using Supabase for your PostgreSQL database and storage, ensure these variables are present and correctly configured in your `backend/.env` file:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### c. Database Connection (PostgreSQL)

Ensure your PostgreSQL database connection details are correctly set in `backend/.env`. If you're using Supabase's PostgreSQL, these might be derived from your Supabase URL or you might connect directly using `pg`.

```
DB_USER=api_backend
DB_PASS=securepass
DB_NAME=medical
DB_HOST=localhost # Or your Supabase database host
```

## 4. Run the Development Server

Start the backend server:

```bash
npm run dev
```

The server should now be running, configured for Firebase Authentication and ready to interact with your Supabase database and storage.