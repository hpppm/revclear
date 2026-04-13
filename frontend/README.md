This is the RevClear frontend. It is a [Next.js](https://nextjs.org) App Router app intended to be deployed on Railway alongside the backend and Whisper services.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

In production, the frontend should proxy `/api/*` server-side to the private backend Railway service. Set `BACKEND_INTERNAL_URL` to the backend internal URL, for example `http://backend.railway.internal:3005/api`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Railway

The production target is to run the frontend on Railway with the backend and Whisper services in the same project. The browser talks to the frontend public domain, and the frontend proxies API traffic privately to the backend.

Check the root runbook for the full deployment layout and environment variable list.
