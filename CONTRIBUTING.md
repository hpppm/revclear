# Contributing to RevClear

Thank you for your interest in contributing. Please read this guide before opening issues or pull requests.

---

## Getting Started

1. Fork the repo and clone your fork
2. Follow the [Quick Start](README.md#quick-start) to get the local stack running
3. Create a branch: `git checkout -b feat/your-feature` or `fix/your-fix`

---

## Branch and Commit Conventions

```
<type>(<scope>): <short description>
```

Types: `feat` `fix` `refactor` `chore` `ci` `docs` `test` `perf`

Examples:
```
feat(encounters): add bulk export endpoint
fix(auth): refresh token rotation on concurrent requests
docs: update Railway deployment guide
```

---

## Security Requirements (Non-Negotiable)

All contributions must follow these rules — PRs that violate them will not be merged:

- **No raw SQL** — all queries go in `backend/src/db/queries.ts`, parameterized only (`$1`, `$2`)
- **No `SELECT *`** — explicit column lists everywhere
- **Dual scope** — every PHI query filters by both `organization_id` AND `clinician_id`
- **PHI encryption** — use `encryptPHIText` / `encryptPHIJson` from `backend/src/utils/crypto.ts`
- **Route middleware** — every authenticated route must have `authMiddleware, requireOrganization` as the first two args
- **httpOnly cookies** — never store tokens in localStorage or return them in response bodies
- **Zod validation** — every input validated with `safeParse()` on both backend and frontend
- **Generic errors** — never expose internal messages, stack traces, or raw DB errors to the client

---

## Pull Requests

- Keep PRs focused — one feature or fix per PR
- All CI checks must pass (type check, lint, tests, security audit)
- Include a description of what changed and why
- Reference any related issues with `Closes #123`

---

## Reporting Vulnerabilities

Do **not** open a public issue for security vulnerabilities. Email the maintainers directly or use GitHub's private vulnerability reporting feature.

---

## License

By contributing, you agree your contributions will be licensed under the [MIT License](LICENSE).
