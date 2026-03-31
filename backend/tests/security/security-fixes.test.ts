/**
 * Security Regression Tests
 *
 * Verifies all security fixes are in place and correct:
 *
 * Fix 1 — S3 Key Path Traversal (transcribe.ts)
 *   User-supplied s3Key is validated against the encounter's stored audio_key
 *   before fetching from S3.
 *
 * Fix 2 — Rate Limit IP Spoofing (server.ts)
 *   trust proxy is set to 1 in production and false in dev/test so that
 *   X-Forwarded-For headers cannot bypass IP-based rate limiting.
 *
 * Fix 3 — Unauthenticated AI Health Endpoint (health.ts)
 *   GET /api/health/ai now requires authMiddleware.
 *
 * Fix 4 — Cross-Clinician SOAP/Transcribe Access (soap.ts + transcribe.ts)
 *   ensureEncounterOwnership uses AND (not OR) for clinician_id + organization_id.
 *
 * Fix 5 — DB Flag Privilege Escalation (users.ts + organizations.ts)
 *   Admin checks use requireRole(['admin']) (Cognito groups) not is_org_admin DB flag.
 */

jest.mock("../../src/config/db", () => ({
  query: jest.fn(),
  findUserByCognitoId: jest.fn(),
  createUser: jest.fn(),
}));

import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const readRoute = (file: string) =>
  fs.readFileSync(path.join(__dirname, `../../src/api/routes/${file}`), "utf-8");

const readSrc = (file: string) =>
  fs.readFileSync(path.join(__dirname, `../../src/${file}`), "utf-8");

const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// ---------------------------------------------------------------------------
// FIX 1 — S3 Key Path Traversal
// ---------------------------------------------------------------------------
describe("Fix 1: S3 key path traversal prevention (transcribe.ts)", () => {
  const content = readRoute("transcribe.ts");

  it("validates s3Key against the encounter's latest audio record before fetching from S3", () => {
    expect(content).toMatch(/SELECT file_url/);
    expect(content).toMatch(/FROM audio_records/);
  });

  it("returns 403 when provided s3Key does not match stored audio_key", () => {
    expect(content).toMatch(/S3 key does not match encounter audio/);
    expect(content).toMatch(/sendError\(res, 403/);
  });

  it("does NOT fetch from S3 before validating key ownership", () => {
    // storedAudioKey check must appear BEFORE getFile call in the else branch
    const elseIndex = content.indexOf("s3Key = parsed.data.s3Key");
    const validationIndex = content.indexOf("S3 key does not match encounter audio");
    const getFileIndex = content.indexOf("getFile(s3Key)");
    expect(validationIndex).toBeGreaterThan(elseIndex);
    expect(getFileIndex).toBeGreaterThan(validationIndex);
  });
});

// ---------------------------------------------------------------------------
// FIX 2 — Rate Limit IP Spoofing via X-Forwarded-For
// ---------------------------------------------------------------------------
describe("Fix 2: trust proxy configuration (server.ts)", () => {
  const content = readSrc("server.ts");

  it("sets trust proxy to 1 in production", () => {
    expect(content).toMatch(/trust proxy.*1/);
  });

  it("sets trust proxy to false in non-production environments", () => {
    expect(content).toMatch(/trust proxy.*false/);
  });

  it("conditions trust proxy on production environment", () => {
    expect(content).toMatch(/production.*trust proxy|trust proxy.*production/s);
  });
});

// ---------------------------------------------------------------------------
// FIX 3 — Unauthenticated AI Health Endpoint
// ---------------------------------------------------------------------------
describe("Fix 3: /api/health/ai requires authentication (health.ts)", () => {
  const content = readRoute("health.ts");

  it("imports authMiddleware", () => {
    expect(content).toMatch(/import.*authMiddleware.*from/);
  });

  it("uses authMiddleware on the /ai route", () => {
    expect(content).toMatch(/router\.get\(["']\/ai["'],\s*authMiddleware/);
  });

  it("does NOT put authMiddleware on the base health route (must stay public)", () => {
    // The base GET "/" should not require auth (needed for uptime monitors)
    const baseRouteMatch = content.match(
      /router\.get\(["']\/["'],\s*(authMiddleware)?/
    );
    expect(baseRouteMatch).not.toBeNull();
    expect(baseRouteMatch![1]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// FIX 4 — Cross-Clinician OR → AND in ensureEncounterOwnership
// ---------------------------------------------------------------------------
describe("Fix 4: ensureEncounterOwnership uses AND not OR (soap.ts + transcribe.ts)", () => {
  it("soap.ts: ownership query uses AND for clinician_id AND organization_id", () => {
    const content = readRoute("soap.ts");
    // Must have AND condition
    expect(content).toMatch(
      /clinician_id = \$2 AND organization_id = \$3/
    );
    // Must NOT use OR in the ownership check
    expect(content).not.toMatch(
      /clinician_id = \$2 OR organization_id = \$3/
    );
  });

  it("transcribe.ts: ownership query uses AND for clinician_id AND organization_id", () => {
    const content = readRoute("transcribe.ts");
    expect(content).toMatch(
      /clinician_id = \$2 AND organization_id = \$3/
    );
    expect(content).not.toMatch(
      /clinician_id = \$2 OR organization_id = \$3/
    );
  });

  it("codes.ts: requireOwnedEncounter still uses correct AND scoping", () => {
    const content = readRoute("codes.ts");
    expect(content).toMatch(/clinician_id = \$2/);
    // codes.ts scopes by clinician_id only (no org fallback) — valid pattern
    expect(content).not.toMatch(/clinician_id = \$2 OR/);
  });

  it("soap.ts mock route does not send an empty transcript into speechToSoap", () => {
    const content = readRoute("soap.ts");
    expect(content).not.toMatch(/transcript:\s*""/);
  });
});

// ---------------------------------------------------------------------------
// FIX 5 — DB Flag Privilege Escalation → requireRole(['admin'])
// ---------------------------------------------------------------------------
describe("Fix 5: Admin access uses requireRole not is_org_admin DB flag", () => {
  it("users.ts: GET / uses organization manager middleware", () => {
    const content = readRoute("users.ts");
    expect(content).toMatch(
      /router\.get\(["']\/["'],\s*authMiddleware,\s*requireRole\(ORGANIZATION_MANAGER_ROLES\)/
    );
  });

  it("users.ts: GET \/:cognitoId uses organization manager middleware", () => {
    const content = readRoute("users.ts");
    expect(content).toMatch(
      /router\.get\(["']\/:cognitoId["'],\s*authMiddleware,\s*requireRole\(ORGANIZATION_MANAGER_ROLES\)/
    );
  });

  it("users.ts: does NOT contain isOrgAdmin helper function", () => {
    const content = readRoute("users.ts");
    expect(content).not.toMatch(/const isOrgAdmin/);
    expect(content).not.toMatch(/is_org_admin.*=== true/);
  });

  it("organizations.ts: POST /invite uses organization manager middleware", () => {
    const content = readRoute("organizations.ts");
    expect(content).toMatch(
      /router\.post\(["']\/invite["'],\s*authMiddleware,\s*requireRole\(ORGANIZATION_MANAGER_ROLES\)/
    );
  });

  it("organizations.ts: GET /members uses organization manager middleware", () => {
    const content = readRoute("organizations.ts");
    expect(content).toMatch(
      /router\.get\(["']\/members["'],\s*authMiddleware,\s*requireRole\(ORGANIZATION_MANAGER_ROLES\)/
    );
  });

  it("organizations.ts: GET /invites uses organization manager middleware", () => {
    const content = readRoute("organizations.ts");
    expect(content).toMatch(
      /router\.get\(["']\/invites["'],\s*authMiddleware,\s*requireRole\(ORGANIZATION_MANAGER_ROLES\)/
    );
  });

  it("organizations.ts: does NOT use is_org_admin DB flag for invite authorization", () => {
    const content = readRoute("organizations.ts");
    // The inline is_org_admin check should be gone from the invite route
    expect(content).not.toMatch(
      /const isAdmin =.*is_org_admin.*user\.role/
    );
  });
});

describe("RBAC capability enforcement on feature routes", () => {
  it("patients.ts uses patient read/write capabilities", () => {
    const content = readRoute("patients.ts");
    expect(content).toMatch(/requireCapability\("read_patients"\)/);
    expect(content).toMatch(/requireCapability\("write_patients"\)/);
  });

  it("encounters.ts uses encounter capability on all routes", () => {
    const content = readRoute("encounters.ts");
    expect(content).toMatch(/router\.get\(["']\/["'],\s*authMiddleware,\s*requireCapability\("manage_encounters"\)/);
    expect(content).toMatch(/router\.post\(["']\/["'],\s*authMiddleware,\s*requireCapability\("manage_encounters"\)/);
    expect(content).toMatch(/router\.put\(["']\/:id["'],\s*authMiddleware,\s*requireCapability\("manage_encounters"\)/);
    expect(content).toMatch(/router\.delete\(["']\/:id["'],\s*authMiddleware,\s*requireCapability\("manage_encounters"\)/);
  });

  it("claims.ts uses claims capability on all routes", () => {
    const content = readRoute("claims.ts");
    expect(content).toMatch(/requireCapability\("manage_claims"\)/);
    expect(content).toMatch(/router\.get\(["']\/encounter\/:encounterId\/preview["'],\s*authMiddleware,\s*requireCapability\("manage_claims"\)/);
  });

  it("soap.ts, codes.ts, and transcribe.ts use clinical AI capability", () => {
    expect(readRoute("soap.ts")).toMatch(/requireCapability\("use_clinical_ai"\)/);
    expect(readRoute("codes.ts")).toMatch(/requireCapability\("use_clinical_ai"\)/);
    expect(readRoute("transcribe.ts")).toMatch(/requireCapability\("use_clinical_ai"\)/);
  });
});

describe("Role-based data minimization on organization and patient reads", () => {
  it("organization routes filter organization responses by role", () => {
    const organizationsContent = readRoute("organizations.ts");
    const meContent = readRoute("me.ts");

    expect(organizationsContent).toMatch(/filterOrganizationForRole\(\s*organization,\s*getEffectiveOrganizationRole\(user\)/);
    expect(organizationsContent).toMatch(/filterOrganizationForRole\(\s*updated,\s*getEffectiveOrganizationRole\(user\)/);
    expect(meContent).toMatch(/filterOrganizationForRole\(organization, effectiveRole\)/);
    expect(meContent).not.toMatch(/cognitoRole/);
  });

  it("patients.ts filters patient and subscriber responses by role", () => {
    const content = readRoute("patients.ts");

    expect(content).toMatch(/filterPatientForRole\(patient, req\.user\?\.role\)/);
    expect(content).toMatch(/filterPatientForRole\(patient, role\)/);
    expect(content).toMatch(/filterSubscriberForRole\(subscriber, req\.user\?\.role\)/);
  });
});

// ---------------------------------------------------------------------------
// FIX 7 — Organization invites must be redeemed atomically
// ---------------------------------------------------------------------------
describe("Fix 7: organization invites are single-use under concurrent requests", () => {
  it("organizations.ts atomically consumes invites with used_at IS NULL inside a transaction", () => {
    const content = readRoute("organizations.ts");

    expect(content).toMatch(/client\.query\("BEGIN"\)/);
    expect(content).toMatch(/UPDATE organization_invites/);
    expect(content).toMatch(/used_at IS NULL/);
    expect(content).toMatch(/expires_at > NOW\(\)/);
    expect(content).toMatch(/client\.query\("COMMIT"\)/);
    expect(content).toMatch(/client\.query\("ROLLBACK"\)/);
  });

  it("organizations.ts stores and applies invite role during create and redeem", () => {
    const content = readRoute("organizations.ts");

    expect(content).toMatch(/CreateOrganizationInviteSchema/);
    expect(content).toMatch(/INSERT INTO organization_invites \(organization_id, token_hash, role, created_by, expires_at\)/);
    expect(content).toMatch(/RETURNING organization_id, role/);
    expect(content).toMatch(/SET organization_id = \$1, role = \$2, is_org_admin = \$3/);
  });

  it("organizations.ts exposes members and invite listing queries for the organization page", () => {
    const content = readRoute("organizations.ts");

    expect(content).toMatch(/SELECT id, email, full_name, role, created_at/);
    expect(content).toMatch(/FROM users/);
    expect(content).toMatch(/WHERE organization_id = \$1/);
    expect(content).toMatch(/FROM organization_invites oi/);
    expect(content).toMatch(/JOIN users creator ON creator\.id = oi\.created_by/);
  });
});

// ---------------------------------------------------------------------------
// FIX 6 — Local AI endpoints allowed only on loopback in development
// ---------------------------------------------------------------------------
describe("Fix 6: local HTTP AI endpoint support is limited to loopback hosts", () => {
  it("codeMatcher.ts allows localhost HTTP only in non-production", () => {
    const content = readSrc("services/ai/providers/codeMatcher.ts");
    expect(content).toMatch(/parsed\.hostname === "localhost"/);
    expect(content).toMatch(/parsed\.hostname === "127\.0\.0\.1"/);
    expect(content).toMatch(/process\.env\.NODE_ENV !== "production"/);
  });
});

// ---------------------------------------------------------------------------
// FIX 5b — requireRole middleware unit tests
// ---------------------------------------------------------------------------
describe("requireRole middleware logic", () => {
  // Needs to import after mock is set up
  const { requireRole } = require("../../src/middleware/auth");

  const makeReq = (role?: string, organizationId = "org-1") => ({
    user: role ? { role, organization_id: organizationId } : undefined,
    auth: undefined,
  });

  it("calls next() when role matches", () => {
    const req = makeReq("admin") as any;
    const res = makeRes();
    const next = jest.fn();
    requireRole(["admin"])(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("returns 403 when role does not match", () => {
    const req = makeReq("clinician") as any;
    const res = makeRes();
    const next = jest.fn();
    requireRole(["admin"])(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when no user present", () => {
    const req = { user: undefined, auth: undefined } as any;
    const res = makeRes();
    const next = jest.fn();
    requireRole(["admin"])(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("clinician cannot access admin-only route", () => {
    const req = makeReq("clinician") as any;
    const res = makeRes();
    const next = jest.fn();
    requireRole(["admin"])(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Forbidden" })
    );
  });

  it("admin can access clinician route (multi-role list)", () => {
    const req = makeReq("admin") as any;
    const res = makeRes();
    const next = jest.fn();
    requireRole(["admin", "clinician"])(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("requires organization membership instead of Cognito role fallback", () => {
    const req = { user: { role: "admin", organization_id: null }, auth: undefined } as any;
    const res = makeRes();
    const next = jest.fn();
    requireRole(["admin"])(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
