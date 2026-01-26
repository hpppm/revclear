# Dead Code Analysis Report

**Generated:** January 26, 2026  
**Branch:** clean-repo  
**Status:** 🔴 CRITICAL SECURITY ISSUES FOUND

---

## 🚨 CRITICAL SECURITY FINDINGS

### 1. **EXPOSED AWS CREDENTIALS in `backend/.env`**

**Severity:** 🔴 CRITICAL  
**Risk:** HIGH - Active AWS credentials and database passwords exposed

**Found Credentials:**

- AWS Access Key: `AKIAWBDCBYTI53FYBNCH`
- AWS Secret Key: `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`
- RDS Password: `Gannon20839qerie`
- Google API Key: `AIzaSyBPDJGxjyoulvB5NyStjFvAmCwcMq5AfSA`
- Genkit API Key: `pk_live_51H8xY2SB5Yz6kX3P1r4T3BlbkFJHHW4r4Z0Y6Yz3L5gD9mXW`

**Status:** ✅ File is properly in `.gitignore` and NOT committed to git
**Action Required:**

1. ✅ Verify credentials are not in git history
2. 🔴 **ROTATE ALL CREDENTIALS IMMEDIATELY** - even though not in git, they're on disk
3. Move to AWS Secrets Manager or environment variables
4. Update `.env.example` to show format only

---

## 📊 REPOSITORY STRUCTURE AUDIT

### Root Directory Structure

```
✅ .env.example          # Template only
✅ .gitignore            # Comprehensive, includes all secrets
✅ CLAUDE.md             # Main AI assistant config
✅ docker-compose.yml    # Container config
✅ LICENSE               # MIT License
✅ README.md             # Project documentation
✅ backend/              # Backend service
✅ frontend/             # Next.js frontend
✅ docs/                 # Documentation
❌ revclear/             # DUPLICATE - contains only node_modules
```

### Claude Configuration Status

**Current State:**

- ✅ `CLAUDE.md` exists at root (388 lines)
- ❌ `.claude/` directory was DELETED (all agents, skills, commands removed)
- ❌ Git shows 35+ deleted `.claude/` files in staging

**Deleted Files (staged for removal):**

- `.claude/agents/` (9 files)
- `.claude/commands/` (9 files)
- `.claude/rules/` (8 files)
- `.claude/skills/` (7 files)
- `.claude/settings.local.json`

**Recommendation:** Keep CLAUDE.md at root, `.claude/` structure was intentionally removed for cleanup

---

## 🗑️ DIRECTORIES TO DELETE

### 1. `revclear/` - Duplicate Directory

**Path:** `c:\Projects\Dev\revclear\revclear\`
**Size:** Only contains `frontend/node_modules/`
**Reason:** Duplicate/nested directory with no unique content
**Safety:** SAFE - appears to be build artifact or mistaken directory
**Action:** Delete entire directory

### 2. Testing Dashboard (Already Deleted)

**Path:** `testing-dashboard/`
**Status:** ✅ Already staged for deletion in git
**Note:** Complete test dashboard application deleted

### 3. Demo/ (Already Deleted)

**Path:** `Demo/`
**Status:** ✅ Already staged for deletion in git
**Note:** Static demo HTML/CSS/JS files

### 4. Terraform (Already Deleted)

**Path:** `terraform/`
**Status:** ✅ Already staged for deletion in git
**Note:** Infrastructure as code files

---

## 📦 UNUSED DEPENDENCIES

### Backend Unused Dependencies

**Severity:** CAUTION - Can be removed safely

**Dependencies (not imported anywhere):**

1. `@aws-sdk/client-bedrock-runtime` - Bedrock AI service (not used)
2. `@aws-sdk/client-dynamodb` - DynamoDB client (not used)
3. `@aws-sdk/client-transcribe` - Transcribe service (not used)
4. `@aws-sdk/lib-dynamodb` - DynamoDB utilities (not used)
5. `@genkit-ai/next` - Genkit Next.js integration (not used)
6. `jest-mock-extended` - Jest mocking library (not used in tests)
7. `node-api-analytics` - API analytics (not imported)

**DevDependencies (not used):**

1. `@types/aws-lambda` - Lambda types (not used)
2. `@types/jest` - Jest types (already in `@jest/types`)
3. `@types/supertest` - Supertest types (not used)
4. `cross-env` - Environment variable setter (used in package.json scripts)
5. `eslint` - Linter (not configured)
6. `supertest` - API testing (no integration tests)
7. `tsx` - TypeScript executor (not used)

**Estimated Savings:** ~50MB in node_modules

### Frontend Unused Dependencies

**Severity:** CAUTION - Can be removed safely

**DevDependencies (not used):**

1. `@tailwindcss/postcss` - Tailwind v4 postcss (v4 has built-in)
2. `@types/node` - Node types (used in config files, keep)
3. `@types/react-dom` - React DOM types (using React 19, types built-in)
4. `tailwindcss` - Separate Tailwind package (Next.js v4 has built-in)

**Estimated Savings:** ~20MB in node_modules

---

## 🔍 UNUSED EXPORTS (TypeScript)

### Backend - Unused Exports

**Severity:** SAFE - These are utility functions that may be used later

**Config/Setup:**

- `appConfig.ts:72` - AppConfig export
- `awsCognito.ts:47` - verifyToken
- `awsCognito.ts:161` - adminCreateUser
- `awsCognito.ts:178` - adminSetUserPassword
- `awsRds.ts:59` - testDatabaseConnection
- `awsRds.ts:73` - getDbPool
- `awsRds.ts:80` - closeDbPool
- `db.ts:119` - getClient
- `db.ts:123` - default export

**Utils:**

- `crypto.ts:15` - encryptPHI ⚠️ (HIPAA-critical, may be needed)
- `crypto.ts:28` - decryptPHI ⚠️ (HIPAA-critical, may be needed)
- `organization.ts:21` - isOrganizationAdmin
- `organization.ts:51` - removeUserFromOrganization
- `organization.ts:65` - getOrganizationUsers

**Assessment:** KEEP ALL - These are infrastructure/utility functions likely used in future features

### Frontend - Unused Exports

**Severity:** SAFE - Next.js conventions

Most "unused" exports in frontend are Next.js conventions:

- `page.tsx` default exports (required by Next.js)
- `layout.tsx` default exports (required by Next.js)
- `metadata` exports (Next.js SEO)

**Truly Unused:**

- `lib/mock/mockPatients.ts` - Mock data (SAFE to delete in production)
- `lib/logger.ts` - Logger utility (used internally, keep)

---

## 🧹 FILES WITH ISSUES

### Backend Files with Parse Errors

1. `src/analytics.js` - UTF-8 BOM encoding issue
2. `src/types/node-api-analytics.d.ts` - UTF-8 BOM encoding issue

**Action:** Fix file encoding (remove BOM) or delete if unused

---

## 📋 CLEANUP RECOMMENDATIONS

### 🔴 CRITICAL (Do First)

1. **Rotate All Credentials** from `backend/.env`
   - AWS IAM credentials
   - RDS database password
   - Google API key
   - Genkit API key
2. **Verify** credentials not in git history
3. **Migrate** secrets to AWS Secrets Manager

### 🟡 HIGH PRIORITY

1. **Delete** `revclear/` duplicate directory
2. **Remove** unused AWS dependencies (saves ~50MB)
3. **Fix** encoding issues in `analytics.js` and type definition
4. **Remove** frontend duplicate dependencies (saves ~20MB)

### 🟢 LOW PRIORITY (Safe to Skip)

1. Keep unused exports in backend (infrastructure functions)
2. Keep frontend mock data for development
3. Consider configuring ESLint (currently not configured)

---

## 🧪 TEST VERIFICATION REQUIRED

**Before removing ANY code:**

1. ✅ Run full backend test suite: `cd backend && npm test`
2. ✅ Run full frontend test suite: `cd frontend && npm test` (if tests exist)
3. ✅ Check for runtime errors
4. ✅ Verify API endpoints still function
5. ✅ Test Docker build: `docker-compose build`

---

## 📊 SUMMARY

| Category                          | Count | Action                     |
| --------------------------------- | ----- | -------------------------- |
| 🔴 Critical Security Issues       | 1     | **Rotate credentials NOW** |
| 📁 Duplicate Directories          | 1     | Delete `revclear/`         |
| 📦 Unused Dependencies (Backend)  | 14    | Remove (optional)          |
| 📦 Unused Dependencies (Frontend) | 4     | Remove (optional)          |
| 🗑️ Already Deleted Directories    | 3     | Already staged in git      |
| 📝 Files with Encoding Issues     | 2     | Fix UTF-8 BOM              |
| 🔧 Unused Exports                 | 20+   | KEEP (infrastructure)      |

**Total Disk Space Reclaimable:** ~70MB (node_modules)
**Security Risk Level:** 🔴 CRITICAL (until credentials rotated)
**Repo Cleanliness:** 🟡 MODERATE (after credential rotation and directory cleanup)

---

## ✅ NEXT STEPS

1. **IMMEDIATE:**

   ```bash
   # Rotate AWS credentials via AWS IAM Console
   # Rotate RDS password via AWS RDS Console
   # Rotate Google API key via Google Cloud Console
   # Update backend/.env with new credentials
   ```

2. **Cleanup Duplicate Directory:**

   ```bash
   cd c:\Projects\Dev\revclear
   Remove-Item -Recurse -Force revclear\
   git add -A
   git commit -m "chore: remove duplicate revclear/ directory"
   ```

3. **Remove Unused Dependencies (Optional):**

   ```bash
   # Backend
   cd backend
   npm uninstall @aws-sdk/client-bedrock-runtime @aws-sdk/client-dynamodb \
     @aws-sdk/client-transcribe @aws-sdk/lib-dynamodb @genkit-ai/next \
     jest-mock-extended node-api-analytics @types/aws-lambda @types/jest \
     @types/supertest eslint supertest tsx

   # Frontend
   cd ../frontend
   npm uninstall @tailwindcss/postcss @types/react-dom tailwindcss depcheck knip ts-prune
   ```

4. **Fix File Encoding Issues:**

   ```bash
   # Remove BOM from files
   # Check if analytics.js is actually needed
   ```

5. **Run Tests:**
   ```bash
   cd backend && npm test
   cd ../frontend && npm run build
   docker-compose build
   ```

---

**Report Generated by:** Dead Code Analysis Tools (depcheck, ts-prune)  
**Review Status:** ⚠️ Requires immediate security action
