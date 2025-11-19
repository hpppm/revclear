# Backend Testing Dashboard

This document captures the UX and backend integration expectations for the backend testing dashboard. The goal is to make the Cognito and S3 services easy to inspect, drive, and troubleshoot while relying on concrete inputs/outputs from the existing Express API. The UI now lives inside the backend (`GET /dashboard` redirects to `/api/dashboard/ui`), so the service and the testing surface run in the same runtime.

## Goals

- Surface the readiness of each AWS service via `/api/dashboard/status` so testers instantly know if the backend has the data it needs.
- Provide a grid of cards—one per service (Cognito, S3, DynamoDB if/when tests cover it)—where each card shows the current health state (`Running`, `Not started`, or `Needs config`) and offers CRUD-style interactions once clicked.
- Display the test data alongside every action, show the live request/response, and highlight success or failure reasons so anyone can follow what the backend is doing.

## Required Backend Configuration

The backend already guards its AWS clients during startup, so you must supply these environment variables (typically via `RevClear/backend/.env`) before running `npm run dev`:

```
AWS_REGION=us-east-1
AWS_USER_POOL_ID=us-east-1_NZCFuSv1l
AWS_CLIENT_ID=5g5qvrvd04h9suejmlie2rjncd
AWS_S3_BUCKET=<your-bucket>
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
PORT=5000
```

`awsCognito.ts` will throw unless `AWS_USER_POOL_ID` and `AWS_CLIENT_ID` are present, and `awsS3.ts` requires `AWS_S3_BUCKET`. The existing tests (`tests/awsCognito.test.ts`, `tests/awsS3.test.ts`) already exercise the helpers that back the dashboard actions, so they are a good reference for what data the backend expects.

## Authentication + Health Status Flow

- Visiting `/dashboard` surfaces the login/sign-up forms before any AWS actions can run; the dashboard will only talk to `/api/dashboard/*` once you have a Cognito `IdToken` from `/api/auth/signin`. Every protected dashboard endpoint (status + S3 operations) requires the `Authorization: Bearer <token>` header and replies with the SDK result or the error so the UI can log success/failure reasons. The cards/logs stay hidden until a login succeeds so services are never exposed to anonymous visitors.
- Test accounts must use the `@localhost.dev` email domain (configurable via `TEST_EMAIL_DOMAIN`); the `/api/auth` routes reject any other addresses so that random logins cannot reach the dashboard.
- When authenticated, the frontend polls `GET /api/dashboard/status` every minute (and on-demand via the refresh button) to update each card’s pill text.

## Health Status Flow

- Frontend polls `GET /api/dashboard/status` to build the card grid. The current implementation (`RevClear/backend/src/api/dashboard.ts`) returns a JSON payload like:

  ```json
  {
    "success": true,
    "health": {
      "awsS3": { "configured": true, "bucket": "revclear-files" },
      "awsCognito": { "configured": true, "clientId": "5g5qvr...", "userPoolId": "us-east-1..." },
      "awsDynamoDb": { "configured": false, "testTableName": null }
    }
  }
  ```

- Each service card interprets `configured === true` as `Running`. If the call fails or returns `configured: false`, show `Needs config` and include the missing env var name as the reason.

## Dashboard endpoints at a glance

- Authentication routes (`/api/auth/signup` and `/api/auth/signin`) remain public so developers can register and grab their tokens. The dashboard stores the returned `IdToken` in local storage and attaches it to the `Authorization` header for every subsequent request.
- `/api/dashboard/status` reports the `health` object shown in the status pills.
- `/api/dashboard/s3/upload`, `/api/dashboard/s3/list`, `/api/dashboard/s3/download-url`, and `/api/dashboard/s3/object` (DELETE) allow the dashboard buttons to exercise S3 with the test file shown on the S3 card. Each route returns the AWS SDK payload or the denial/error message so the UI can describe why an action succeeded or failed.

## Card Interactions

Each card should expand (modal, accordion, or panel) to reveal CRUD-style buttons and a “Test record” section describing the data sent to the backend. Every button triggers the relevant backend helper and streams its result into a console/log section that shows:

1. Request payload (body, query, headers).
2. Response body or error message.
3. Success indicator (`✔` vs. `✖`) and a short reason for failures (e.g., missing credentials, 404, AWS throttling).

### Cognito Card

- **Test Data**
  ```ts
  const testUsers = [
    { username: "clinic-a-user", email: "a@example.com", password: "Secret123!", group: "Clinic_A" },
    { username: "clinic-b-user", email: "b@example.com", password: "Secret123!", group: "Clinic_B" },
  ];
  ```

- **Actions**
  - Sign up: POST to `signUpUser` (uses `SignUpCommand` in `src/config/awsCognito.ts`).
  - Confirm sign-up: POST confirmation code (`ConfirmSignUpCommand`).
  - Sign in: call `signInUser` to retrieve tokens (`InitiateAuthCommand`).
  - Admin create/set password: exercise `adminCreateUser`/`adminSetUserPassword`.

- **Feedback**
  Show AWS response (tokens or `UserConfirmed`/`ChallengeName`), include the HTTP status from the backend (200 vs 4xx), and bubble up SDK errors (e.g., `UserNotFoundException`).

### S3 Card

- **Test Data**
  ```ts
  const testFile = {
    key: "test-reports/encounter-a.json",
    contentType: "application/json",
    body: JSON.stringify({ patientId: "A", encounterDate: "2025-09-01" }),
  };
  ```

- **Actions**
  - Upload (`uploadFile`) with AES-256 encryption. 
  - List (`listFiles`) to confirm the key is present.
  - Download (`getDownloadUrl` or `getFile`) to verify the object is retrievable.
  - Delete (`deleteFile`) to clean up.

- **Feedback**
  Display the signed URLs or raw object data returned alongside HTTP status, and show AWS errors (e.g., access denied) in the log. Each action should clearly state whether the object currently exists in the bucket.

### DynamoDB Card (Optional)

- The dashboard health check already includes `testTableName` from `src/config/awsDynamoDb.ts`. If you add CRUD helpers, the card should run quick `put/get/delete` operations on that table and log the key values and outcomes.

## Implementation Notes

- Keep the UI grid in sync with `/api/dashboard/status`; re-poll every 30–60 seconds or when a service card action returns a 500-level response so operators immediately notice config drift.
- Reuse the backend helpers (Cognito and S3 commands under `RevClear/backend/src/config/`) to keep tests and production paths aligned. The Jest mocks in `RevClear/backend/tests` describe the expected command shapes you can replay from the dashboard.
- Make sure the dashboard’s action logs show both the request (including hard-coded test data) and the backend response body so testers can reproduce failures using `curl` or Postman if needed.
- Surface failure reasons as human-readable sentences (e.g., `Missing AWS_S3_BUCKET in environment`, `AccessDenied: Your credentials do not allow s3:PutObject`).

When you are ready to build the UI, this spec should guide how each card calls the backend, what payloads to send, and how to report success/failure to the user.
