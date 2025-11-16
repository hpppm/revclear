# Lambda Auth Handlers (Cognito)

These Lambda functions mirror the `/api/auth/signup` and `/api/auth/signin` flows used by the backend Express API, but are designed to be deployed behind Amazon API Gateway. The idea is:

- Frontend (`frontend/` or `dash-backend/`) calls API Gateway.
- API Gateway invokes these Lambda handlers.
- Handlers use Amazon Cognito as the identity provider.

This replaces the previous Firebase-based auth wiring in the frontend.

## Files

- `lambda/auth-signup.ts` – sign‑up + optional auto‑confirm + optional auto‑login for test users.
- `lambda/auth-signin.ts` – plain sign‑in using Cognito `USER_PASSWORD_AUTH`.

## Environment Variables

Configure these environment variables on each Lambda function:

- `AWS_REGION` – AWS region (e.g. `us-east-1`).
- `COGNITO_USER_POOL_ID` – Cognito User Pool ID (for auto‑confirm).
- `COGNITO_USER_POOL_CLIENT_ID` – App client ID used for `SignUp` and `InitiateAuth`.
- `TEST_EMAIL_DOMAIN` – optional; restricts signups to test domains (defaults to `@localhost.dev`).
- `AUTO_CONFIRM_SIGNUP` – `"true"`/`"false"` (default: `"true"`).
- `AUTO_LOGIN_AFTER_SIGNUP` – `"true"`/`"false"` (default: `"true"`).

### Example: auth-signup Lambda (API Gateway request)

- **Method:** `POST`
- **Body:**

```json
{
  "email": "tester@localhost.dev",
  "password": "Secret123!",
  "attributes": {
    "custom:clinic": "Clinic_A"
  }
}
```

- **Response (200):**

```json
{
  "message": "User signed up successfully. Account auto-confirmed for testing. Authentication tokens are included for immediate dashboard access.",
  "autoConfirm": { "enabled": true, "success": true },
  "autoLogin": { "enabled": true, "success": true },
  "AuthenticationResult": {
    "AccessToken": "...",
    "IdToken": "...",
    "RefreshToken": "...",
    "ExpiresIn": 3600,
    "TokenType": "Bearer"
  },
  "existingAccount": false
}
```

On frontend, store the `IdToken` in memory/localStorage and send it as a Bearer token to protected APIs (mirroring how `dash-backend` uses it).

### Example: auth-signin Lambda

- **Method:** `POST`
- **Body:**

```json
{
  "email": "tester@localhost.dev",
  "password": "Secret123!"
}
```

- **Response (200):**

```json
{
  "message": "User signed in successfully.",
  "AuthenticationResult": {
    "AccessToken": "...",
    "IdToken": "...",
    "RefreshToken": "...",
    "ExpiresIn": 3600,
    "TokenType": "Bearer"
  }
}
```

## Frontend Integration Sketch

In `frontend/`, you would eventually:

- Remove the Firebase client and `AuthContext` dependency.
- Add an auth client module that calls these Lambda endpoints, for example:

```ts
// src/lib/authClient.ts
const AUTH_BASE = process.env.NEXT_PUBLIC_AUTH_API_BASE!;

export async function signIn(email: string, password: string) {
  const res = await fetch(`${AUTH_BASE}/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("Failed to sign in");
  return res.json();
}
```

Front‑end components (login form, create account screen) can then call `signIn`/`signUp`, store the `IdToken`, and behave exactly like the dashboard client in `dash-backend` does today.

