# Frontend Setup TODO List

This document outlines the steps to set up and run the frontend application locally.

## 1. Navigate to the Frontend Directory

```bash
cd frontend
```

## 2. Install Dependencies

Ensure all necessary Node.js packages are installed:

```bash
npm install
```

## 3. Configure Environment Variables (`.env.local`)

Create a `.env.local` file in the `frontend/` directory and populate it with the following environment variables. These are crucial for connecting the frontend to Firebase, Supabase, and your backend API.

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-firebase-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-firebase-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-firebase-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-firebase-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-firebase-app-id
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001 # Or your deployed backend URL
```

*   **Firebase Credentials:** Obtain these from your Firebase project settings.
*   **Supabase Credentials:** Obtain these from your Supabase project settings.
*   **Backend URL:** Set this to the URL where your backend API is running (e.g., `http://localhost:3001` for local development, or your deployed Cloud Run URL).

## 4. Run the Development Server

Start the Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.
