# Backend Setup TODO List (Firebase Auth + Supabase DB/Storage)

⚠️ **STATUS: INCOMPLETE - NOT READY TO RUN YET**

The backend skeleton exists but is missing several route files. Rasmus needs to create these before the server will start.

**Missing Files (Required):**
- `src/api/auth/index.ts` - Authentication routes
- `src/api/encounters/index.ts` - Encounter/SOAP notes routes
- `src/api/ai/index.ts` - AI processing routes
- `src/api/claims/index.ts` - Claims management routes
- `src/api/feedback/index.ts` - Feedback routes
- `src/api/notifications/index.ts` - Notification routes

**Existing Files:**
- ✅ `src/api/patients/index.ts` - Patient routes (already created)

---

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

⚠️ **NOTE: Server will not start until missing route files are created!**

Once all route files are created, start the backend server:

```bash
npm run dev
```

The server should run on **http://localhost:8080**, configured for Firebase Authentication and ready to interact with your Supabase database and storage.

**Current Error:**
```
Error: Cannot find module './auth'
```

**Solution:** Create the missing route files listed at the top of this document before attempting to run the server.