# Frontend

Next.js + React app

## Run it

```bash
cd RevClear/frontend
npm install
npm run dev
```

opens at http://localhost:3000

> **Important:** Before implementing or changing any dashboard-facing feature here, read `../dash-backend/DASH_WORKFLOW.md`. That sandbox is the canonical reference for how Cognito/S3/Dynamo flows should behave, and all frontend work must mirror the preserved patterns documented there.

## Whats in it

- Next.js 14 with app router
- TailwindCSS for styling
- connects to backend API
- deployed on AWS Amplify
