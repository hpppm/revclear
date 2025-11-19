RevClear’s dashboard UI now lives here as a dedicated [Next.js](https://nextjs.org) application. It renders the same authentication helpers that ship with the backend (`/api/dashboard/*`) but in a modern React/Tailwind experience.

## Getting Started

The dashboard expects the Express API to be running so it can call `/api/auth/*` and `/api/dashboard/*`. By default the dev server proxies everything under `/api/*` to `http://localhost:3005/api/*`. Point it to another host/port by exporting `REVCLEAR_API_ORIGIN` **before** starting Next.js:

```bash
export REVCLEAR_API_ORIGIN="http://localhost:3005"
npm run dev
```

If you’re hosting the dashboard somewhere that cannot rely on the built-in rewrite, set `NEXT_PUBLIC_DASHBOARD_API_BASE` to the fully-qualified API base so the browser fetches the right origin (for example `https://api.revclear.test/api`).

Otherwise run the dev server as usual:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to load the dashboard UI. The page auto-updates as you edit files under `src/app`.

## Project Structure

- `src/app/page.js` renders the dashboard markup and wires up the legacy DOM interactions via `initializeDashboard`.
- `src/lib/dashboardClient.js` hosts the migrated Vanilla JS logic that talks to Cognito/S3/DynamoDB helpers.
- `src/app/dashboard.css` mirrors the original static styles.
- `DASH_WORKFLOW.md` documents the “do-not-modify” expectations for this app. New contributors (human or AI) must read it before editing anything in `dash-backend`.

Use `npm run build` + `npm run start` for a production build once you are ready to deploy behind the existing backend.
