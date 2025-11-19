# Backend Dashboard & Testing Notes

This note explains how to reach the backend-facing UI assets and how they travel through the build process after consolidating everything around the dashboard console.

## Static dashboard assets

- The only static UI now lives in `src/dashboard.html`, `src/dashboard.js`, and `src/dashboard.css`. These files contain the Cognito/S3 tester that used to be assembled inside `src/api/dashboard.ts`.
- The Express server exposes them at `GET /api/dashboard/ui` (with `/dashboard` acting as the shortcut route). There is no longer a `/landing` endpoint or `backend-landing.html` asset to maintain.
- During `npm run build`, the files are copied into `dist/` so `npm start` can serve the same UI without ts-node or a bundler. If you introduce additional static assets, place them in `src/` and update the build script to copy them into `dist/`.

## Dashboard & docs flow

- Developers should still sign up/sign in via `/api/auth` before hitting the protected dashboard endpoints described in `docs/dashboard/backend-dashboard-testing.md`.
- `src/setupEnv.ts` loads `RevClear/backend/.env` before the dashboard/auth routes are resolved so the AWS clients can read the Cognito and S3 keys as soon as the app boots.
- `/dashboard` redirects to `/api/dashboard/ui`; rely on that route whenever you need to exercise AWS helpers without running the frontend.
- The `docs/` hierarchy keeps `dashboard/`, `db/`, and `testing/` notes close to the code—drop follow-up guidance there as the dashboard evolves.
