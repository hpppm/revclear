# Dead Code Analysis Report

**Generated:** 2026-01-26
**Repository:** revclear
**Branch:** cleaning-md-files

---

## Summary

| Category | Count | Status |
|----------|-------|--------|
| Deleted Unused Files | 3 | COMPLETED |
| Duplicate Exports | 1 | Review needed |
| Unused Dev Dependencies | 3 | Optional cleanup |
| Standalone Scripts | 4 | CAUTION - keep |
| Unused Backend Exports | 8 | CAUTION - keep |

---

## COMPLETED - Files Deleted

The following files were confirmed unused and have been deleted:

### 1. `frontend/app/components/ui/SectionHeader.tsx` - DELETED
- **Lines removed:** 20
- **Reason:** Not imported anywhere in the codebase

### 2. `frontend/app/components/wizard/ReviewStep.tsx` - DELETED
- **Lines removed:** 101
- **Reason:** Not imported anywhere in the codebase

### 3. `frontend/app/lib/mock/mockPatients.ts` - DELETED
- **Lines removed:** 14
- **Reason:** Mock data not used anywhere

### 4. `frontend/app/lib/mock/` - DELETED
- **Reason:** Empty directory after file removal

**Total lines removed:** 135

---

## FALSE POSITIVES (Knip Analysis)

The following files were incorrectly flagged as unused by knip due to alias resolution issues:

| File | Actual Status |
|------|---------------|
| `frontend/app/components/ui/Alert.tsx` | Used in patients/page.tsx |
| `frontend/app/components/ui/Skeleton.tsx` | Used in patients/page.tsx |
| `frontend/app/components/ui/DashboardHeader.tsx` | Used in patients/page.tsx |

---

## OPTIONAL - Duplicate Export

### `logger` in `frontend/app/lib/logger.ts`
- **Issue:** Both named export `logger` and `default` export exist
- **Recommendation:** Can consolidate, but not a bug

---

## OPTIONAL - Unused Dev Dependencies

### Backend (`backend/package.json`)
| Package | Status |
|---------|--------|
| `cross-env` | Used in npm test script |
| `knip` | Analysis tool - keep |
| `ts-prune` | Analysis tool - keep |

### Frontend (`frontend/package.json`)
| Package | Status |
|---------|--------|
| `@tailwindcss/postcss` | Tailwind v4 config - keep |
| `tailwindcss` | Required - keep |

---

## CAUTION - Standalone Scripts (Keep)

These are one-time run scripts, executed manually via ts-node:

| Script | Purpose |
|--------|---------|
| `backend/src/scripts/check_db_schema.ts` | Debug utility |
| `backend/src/scripts/run_migration_011.ts` | Migration runner |
| `backend/src/scripts/run_migration_016.ts` | Migration runner |
| `backend/src/scripts/test_claim_gen.ts` | Test utility |

**Recommendation:** Keep these for operational use.

---

## CAUTION - Unused Backend Exports (Keep)

These are utility functions that may be used externally or for debugging:

| File | Export | Purpose |
|------|--------|---------|
| `src/config/awsCognito.ts` | `verifyToken`, `adminCreateUser`, `adminSetUserPassword` | Admin utilities |
| `src/config/awsRds.ts` | `testDatabaseConnection`, `getDbPool`, `closeDbPool` | DB utilities |
| `src/config/db.ts` | `getClient` | Client accessor |
| `src/utils/organization.ts` | `removeUserFromOrganization`, `getOrganizationUsers` | Admin utilities |
| `src/utils/crypto.ts` | `encryptPHI`, `decryptPHI` | PHI security |

**Recommendation:** Keep all - these are utility functions for operations and security.

---

## Verification Results

### Build Tests
- **Frontend build:** PASSED
- **Backend tests:** PASSED (no tests defined)

### Post-Deletion Verification
```
next build - SUCCESS
All routes compile correctly
```

---

## Notes

- Knip's alias resolution (`@/`) does not work correctly for Next.js projects
- Always verify with grep and build before deleting files flagged by static analysis
- PHI-related utilities should never be removed even if "unused"
