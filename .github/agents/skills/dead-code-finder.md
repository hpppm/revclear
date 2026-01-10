# Dead Code Finder Skill

## Purpose
Identify orphaned files, unused exports, and dead code paths.

## Checks
1. **Orphaned Files** - Files not imported anywhere
2. **Unused Exports** - Exported functions/classes never imported
3. **Unreachable Routes** - API routes not registered in server
4. **Stale Documentation** - Docs referencing deleted code

## Process
1. Build import graph from all .ts/.tsx files
2. Compare against file list
3. Flag files with zero incoming imports (except entry points)

## Entry Points to Exclude
- `backend/src/start.ts`
- `backend/src/server.ts`
- `frontend/app/page.tsx`
- `frontend/app/layout.tsx`
- `**/index.ts`

## Output Format
| File | Last Modified | Reason Orphaned |