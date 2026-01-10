# API Inventory & Management Skill

## Purpose
Count, catalog, and validate all API endpoints in the application.

---

## Checks

### 1. Endpoint Discovery
- Scan all route files for registered endpoints
- Extract HTTP method, path, and handler
- Map middleware applied to each route

### 2. Authentication Status
| Status | Meaning |
|--------|---------|
| 🔒 Protected | Has authMiddleware |
| 🔓 Public | No auth required |
| ⚠️ Partial | Some methods protected |

### 3. Documentation Coverage
- Check if endpoint has Swagger/OpenAPI annotation
- Flag undocumented endpoints

### 4. Rate Limiting
- Identify which routes have rate limiting
- Flag high-risk endpoints without limits

---

## Commands

```bash
# Find all route registrations
grep -rn "router\.\(get\|post\|put\|patch\|delete\)" --include="*.ts" backend/src/api/routes/

# Find all app.use route mounts
grep -rn "app\.use.*\/api" --include="*.ts" backend/src/

# Count endpoints per file
find backend/src/api/routes -name "*.ts" -exec sh -c 'echo "$1: $(grep -c "router\." "$1")"' _ {} \;

# Find routes with auth middleware
grep -rn "authMiddleware" --include="*.ts" backend/src/api/routes/

# Find routes with rate limiting
grep -rn "rateLimit" --include="*.ts" backend/src/
```

---

## Route Files Location
```
backend/src/api/routes/
├── auth.ts
├── claims.ts
├── codes.ts
├── encounters.ts
├── health.ts
├── me.ts
├── organizations.ts
├── patients.ts
├── security.ts
├── soap.ts
├── transcribe.ts
├── users.ts
└── dev/
    ├── index.ts
    ├── dynamodb.ts
    ├── postgres.ts
    └── s3.ts
```

---

## Output Format

### API Inventory Table
| # | Method | Path | Auth | Rate Limit | Documented | File |
|---|--------|------|------|------------|------------|------|
| 1 | POST | /api/auth/login | 🔓 | ✅ 10/min | ✅ | auth.ts |
| 2 | GET | /api/patients | 🔒 | ❌ | ✅ | patients.ts |
| 3 | GET | /api/security/stats | 🔓 | ❌ | ❌ | security.ts |

### Summary Stats
```
Total Endpoints: XX
├── Protected: XX (XX%)
├── Public: XX (XX%)
├── Rate Limited: XX (XX%)
└── Documented: XX (XX%)
```

---

## Risk Assessment

### High Risk (Fix Immediately)
- Public endpoints with write operations (POST/PUT/DELETE)
- Endpoints exposing sensitive data without auth
- Admin routes without role checking

### Medium Risk (Review)
- Public GET endpoints returning lists
- Endpoints without rate limiting
- Undocumented endpoints

### Low Risk (Track)
- Health check endpoints
- Public authentication endpoints

---

## Validation Checks

```typescript
// Expected route registration pattern
router.get("/path", authMiddleware, handler);
router.post("/path", authMiddleware, validate(schema), handler);

// Flags to check
[ ] Every non-public route has authMiddleware
[ ] POST/PUT/PATCH routes have validation middleware
[ ] DELETE routes have authorization checks
[ ] List endpoints have pagination
[ ] Sensitive endpoints have audit logging
```

---

## Integration with server.ts

Verify all route files are mounted:

```typescript
// Expected in server.ts
app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
// ... etc
```

Cross-reference mounted routes vs route files to find orphaned routers.

---

## Swagger Coverage Check

```bash
# Find routes with @swagger annotations
grep -rn "@swagger" --include="*.ts" backend/src/api/routes/ | wc -l

# Compare to total routes
grep -rn "router\.\(get\|post\|put\|patch\|delete\)" --include="*.ts" backend/src/api/routes/ | wc -l
```