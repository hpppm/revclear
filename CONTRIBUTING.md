<div align="center">

# 🤝 Contributing to RevClear

[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=flat-square)](https://github.com/hpppm/revclear/pulls)
[![Code Style](https://img.shields.io/badge/Code_Style-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Security](https://img.shields.io/badge/Security-HIPAA_Aligned-red?style=flat-square)](https://revclear.tech)

</div>

---

## 🚀 Getting Started

1. Fork the repo and clone your fork
2. Follow the [Quick Start](README.md#quick-start) to get the local stack running
3. Create a branch — `feat/your-feature` or `fix/your-fix`
4. Open a pull request against `main`

---

## 📝 Commit Conventions

```
<type>(<scope>): <short description>
```

| Type | When to use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code change with no behavior change |
| `chore` | Tooling, deps, config |
| `ci` | CI/CD pipeline changes |
| `docs` | Documentation only |
| `test` | Tests only |
| `perf` | Performance improvement |

**Examples:**
```
feat(encounters): add bulk export endpoint
fix(auth): refresh token rotation on concurrent requests
docs: update Railway deployment guide
```

---

## 🔐 Security Requirements (Non-Negotiable)

> All contributions **must** follow these rules. PRs that violate them will not be merged.

<details open>
<summary><b>SQL & Data Access</b></summary>
<br>

- ❌ No raw SQL outside `backend/src/db/queries.ts`
- ❌ No string interpolation into SQL — parameterized queries only (`$1`, `$2`)
- ❌ No `SELECT *` or `RETURNING *` — explicit column lists always
- ✅ Every PHI query must filter by **both** `organization_id` **AND** `clinician_id`

</details>

<details open>
<summary><b>PHI & Encryption</b></summary>
<br>

- ✅ All PHI fields encrypted with `encryptPHIText` / `encryptPHIJson` from `backend/src/utils/crypto.ts`
- ❌ Never log PHI — no patient names, DOBs, diagnoses in any log output
- ❌ Never mutate the record directly — use `transformPHIFields` which returns a new object
- ✅ Mixed-mode reads: always check `isEncryptedPHIText` / `isEncryptedPHIJson` before decrypting

</details>

<details open>
<summary><b>Auth & Cookies</b></summary>
<br>

- ✅ JWT tokens in httpOnly, Secure, SameSite=Strict cookies only
- ❌ Never store tokens in localStorage, sessionStorage, or response body
- ✅ Every authenticated route must start with `authMiddleware, requireOrganization`
- ✅ Admin-only routes insert `requireRole(['admin'])` between the two above

</details>

<details open>
<summary><b>Input Validation</b></summary>
<br>

- ✅ Zod validation on every input — `safeParse()` → 400 on failure
- ✅ Backend schemas in `backend/src/types/zod.ts`
- ✅ Frontend schemas in `frontend/app/lib/validation/schemas.ts`

</details>

<details open>
<summary><b>Error Handling</b></summary>
<br>

- ❌ Never expose internal messages, stack traces, or raw DB errors to the client
- ✅ Always `next(error)` — never `res.status(500).json({ error: err.message })`
- ✅ Generic safe messages to client only

</details>

---

## 📐 API Response Shape

Every endpoint must return one of these four shapes — nothing else:

```typescript
// Single item
{ success: true, data: payload }

// Paginated list
{ success: true, data: [...], pagination: { limit, offset, total } }

// Validation failure
{ success: false, errors: zodErrors }

// Auth / system error
{ error: "safe message" }
```

---

## ✅ Pull Request Checklist

Before opening a PR, verify:

- [ ] Tests pass: `cd backend && npm test`
- [ ] Type check passes: `npx tsc --noEmit`
- [ ] Lint passes: `cd frontend && npm run lint`
- [ ] Security audit clean: `npm audit --audit-level=high`
- [ ] No `SELECT *` or unparameterized SQL introduced
- [ ] PHI queries include both `organization_id` and `clinician_id`
- [ ] No PHI in logs
- [ ] No tokens outside httpOnly cookies
- [ ] Manually tested the changed flow end-to-end

---

## 🛡️ Reporting Vulnerabilities

Do **not** open a public issue for security vulnerabilities. Use GitHub's private vulnerability reporting feature or contact the team directly.

---

## 📄 License

By contributing, you agree your contributions will be licensed under the [MIT License](LICENSE).
