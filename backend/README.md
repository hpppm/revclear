# RevClear — Backend

Express + TypeScript REST API. Port `3005` by default.

## Run locally

```bash
cd backend
cp .env.example .env   # fill in your values
npm install
npm run dev
```

## Commands

```bash
npm run dev        # start with ts-node (hot reload)
npm run build      # compile TypeScript → dist/
npm start          # run compiled output
npm test           # Jest test suite
npx tsc --noEmit   # type check only
```

## Structure

```
src/
├── api/routes/     REST endpoints (one file per resource)
├── config/         DB, AWS, Cognito, S3 clients
├── constants/      Shared enumerations
├── data/ai/        Curated ICD-10 / CPT code datasets
├── db/queries.ts   ALL SQL — parameterized, explicit columns
├── middleware/     auth, audit, rate limiting, error handling
├── scripts/        One-off DB migration runners
├── services/       Business logic (AI, claims, encounters, EDI)
├── types/          Zod schemas and Express type extensions
└── utils/          Crypto, logger, error classes, helpers
```

## Environment

Copy `.env.example` to `.env` and fill in all values before starting. The server will refuse to start if `PHI_ENCRYPTION_KEY` or required AWS variables are missing.

See the [root RUNBOOK](../docs/RUNBOOK.md) for the full deployment guide.
