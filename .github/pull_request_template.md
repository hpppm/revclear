## 📋 Summary

<!-- What does this PR do and why? -->

## 🔖 Type of Change

- [ ] 🐛 Bug fix
- [ ] ✨ New feature
- [ ] ♻️ Refactor
- [ ] 📚 Docs / chore
- [ ] 🔐 Security fix

## 🔐 Security Checklist

- [ ] No raw SQL outside `backend/src/db/queries.ts` — parameterized only (`$1`, `$2`)
- [ ] No `SELECT *` or `RETURNING *` — explicit column lists
- [ ] PHI queries filter by **both** `organization_id` **AND** `clinician_id`
- [ ] PHI fields encrypted with helpers from `crypto.ts`
- [ ] Route middleware order: `authMiddleware, requireOrganization` (+ `requireRole` for admin routes)
- [ ] Zod `safeParse()` on all new inputs
- [ ] No tokens in localStorage or response bodies
- [ ] No internal errors or stack traces returned to client
- [ ] No PHI in any log output

## ✅ Test Plan

- [ ] `cd backend && npm test` passes
- [ ] `npx tsc --noEmit` passes (backend + frontend)
- [ ] `cd frontend && npm run lint` passes
- [ ] `npm audit --audit-level=high` clean
- [ ] Manually tested: <!-- describe what you clicked through -->

## 🔗 Related Issues

Closes #
