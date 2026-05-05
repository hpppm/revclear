## Summary

<!-- What does this PR do and why? -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor
- [ ] Docs / chore

## Security checklist

- [ ] No raw SQL — all queries in `backend/src/db/queries.ts`, parameterized
- [ ] PHI queries filter by both `organization_id` AND `clinician_id`
- [ ] PHI fields encrypted with helpers from `crypto.ts`
- [ ] Route middleware order: `authMiddleware, requireOrganization` (or `requireRole` for admin)
- [ ] Zod validation on all new inputs (`safeParse`)
- [ ] No tokens in localStorage or response bodies
- [ ] No internal errors or stack traces returned to client

## Test plan

- [ ] Unit tests pass (`npm test`)
- [ ] Type check passes (`npx tsc --noEmit`)
- [ ] Lint passes (`npm run lint`)
- [ ] Manually tested: <!-- describe what you tested -->

## Related issues

Closes #
