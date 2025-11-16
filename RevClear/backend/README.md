# Backend

Node.js + Express API  
still working on this (phase 2)

## Run it

```bash
cd RevClear/backend
npm install
# Starts only the Express API (PORT=3005 by default)
PORT=5000 npm run dev
```

Make a `.env` file with your AWS credentials. By default the server listens on port `3005`, but you can override it via `PORT`.

## Environment loading

The server bootstraps the environment variables from `RevClear/backend/.env` (via `src/setupEnv.ts`) before importing the AWS helpers, so just edit that file rather than juggling export commands when running `npm run dev`.

To keep the dashboard test-only, signup/login emails must end with `@localhost.dev` (override via the `TEST_EMAIL_DOMAIN` env variable).

## Documentation

Additional backend-focused documentation lives under `RevClear/backend/docs/`:

- `dashboard/backend-dashboard-testing.md` describes the auth-gated dashboard, health endpoints, and S3 test flows.
- `db/` keeps the SQL schema and any other persistence notes.
- Drop new docs alongside these directories as you expand backend guidance.

## Dashboard UI

The testing console now lives in the separate Next.js app under `RevClear/dash-backend`.

```bash
cd RevClear/dash-backend
npm install
npm run dev
```

By default the dashboard dev server runs on `http://localhost:3000` (or the next open port) and proxies `/api/*` requests to whatever origin you specify via `REVCLEAR_API_ORIGIN` (defaults to `http://localhost:3005`). The backend still exposes the `/api/dashboard/*` routes for health checks and AWS helpers, but it no longer serves the static HTML directly.

## What it does

- REST API for patient data
- connects to DynamoDB and S3
- will add Cognito auth and Lambda functions later
