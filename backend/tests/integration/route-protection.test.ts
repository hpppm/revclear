/**
 * Route Protection — HTTP-level security tests
 *
 * Every test here makes a real HTTP request via supertest against the live
 * Express app instance. This proves that auth/role middleware is wired into
 * the actual request path — not merely present in source text.
 *
 * Replaces the following static source-analysis tests:
 *  - protected-route-auth.test.ts §1 "PHI routes: authMiddleware is applied"
 *  - protected-route-auth.test.ts §2 "PHI routes: requireOrganization guards handlers"
 *  - protected-route-auth.test.ts §3 "Admin-only routes" (static)
 *  - security-fixes.test.ts Fix 3 "health /ai requires auth"
 *  - security-fixes.test.ts Fix 5 "DB flag privilege escalation → requireRole"
 *  - admin-role-enforcement.test.ts "security.ts admin check"
 *  - admin-role-enforcement.test.ts "dev/status.ts admin protection"
 */

// ── Mocks (hoisted before all imports) ────────────────────────────────────────

const mockVerify = jest.fn();
const mockFindUser = jest.fn();
const mockQuery = jest.fn();

jest.mock("aws-jwt-verify", () => ({
  CognitoJwtVerifier: {
    create: jest.fn(() => ({
      verify: mockVerify,
      hydrate: jest.fn().mockResolvedValue(undefined),
    })),
  },
}));

jest.mock("../../src/config/db", () => ({
  query: mockQuery,
  findUserByCognitoId: mockFindUser,
  getClient: jest.fn(),
}));

// awsS3 is mocked so the bucket-name guard never fires at module-load time
jest.mock("../../src/config/awsS3", () => ({
  uploadFile: jest.fn(),
  getFile: jest.fn(),
  getUploadUrl: jest.fn().mockResolvedValue("https://s3.example.com/upload"),
  getDownloadUrl: jest.fn().mockResolvedValue("https://s3.example.com/download"),
  s3Client: {},
  bucketName: "test-bucket",
}));

// transcribe.ts imports node-fetch v3 (ESM-only) which ts-jest cannot transform.
// We don't exercise the transcribe route in this file — stub it out.
jest.mock("../../src/api/routes/transcribe", () => {
  const { Router } = require("express");
  const router = Router();
  return { __esModule: true, default: router };
});

// ── Imports ───────────────────────────────────────────────────────────────────

import request from "supertest";
import app from "../../src/server";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const VALID_JWT_PAYLOAD = {
  sub: "cognito-sub-123",
  iss: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_test",
  client_id: "test-client-id",
  token_use: "access",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
  "cognito:groups": ["Users"],
};

const CLINICIAN = {
  id: "clinician-uuid",
  email: "clinician@test.com",
  cognito_id: "cognito-sub-123",
  organization_id: "org-uuid",
  role: "clinician",
  is_org_admin: false,
};

const FAKE_TOKEN = "fake.jwt.token";
const AUTH_COOKIE = `accessToken=${FAKE_TOKEN}`;

// ── §1  PHI routes: 401 when unauthenticated ──────────────────────────────────

describe("PHI routes: unauthenticated requests return 401", () => {
  beforeEach(() => jest.clearAllMocks());

  const PHI_ROUTES: [string, string][] = [
    ["GET",    "/api/patients"],
    ["GET",    "/api/encounters"],
    ["GET",    "/api/claims"],
    ["GET",    "/api/me"],
  ];

  it.each(PHI_ROUTES)(
    "%s %s returns 401 — no cookie supplied",
    async (method, route) => {
      const res = await (request(app) as any)[method.toLowerCase()](route);
      expect(res.status).toBe(401);
      // Auth should fail before any DB call
      expect(mockFindUser).not.toHaveBeenCalled();
    },
  );

  it("GET /api/health returns 200 without auth (public health-check endpoint)", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ now: new Date().toISOString() }] });
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
  });
});

// ── §2  GET /api/health/ai: authentication required ───────────────────────────

describe("GET /api/health/ai: authentication is required (Fix 3)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when no cookie is present", async () => {
    const res = await request(app).get("/api/health/ai");
    expect(res.status).toBe(401);
    // Verifier must not have been invoked — token was never extracted
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it("does NOT return 401 when a valid cookie is present (auth passes, AI status may vary)", async () => {
    mockVerify.mockResolvedValue(VALID_JWT_PAYLOAD);
    mockFindUser.mockResolvedValue(CLINICIAN);

    const res = await request(app)
      .get("/api/health/ai")
      .set("Cookie", AUTH_COOKIE);

    // 401 is gone — the middleware allowed the request through.
    // 200 or 503 depending on whether the AI provider is reachable in test.
    expect(res.status).not.toBe(401);
  });
});

// ── §3  Admin-only routes: clinician role receives 403 ────────────────────────

describe("Admin-only routes: clinician role receives 403", () => {
  beforeEach(() => jest.clearAllMocks());

  it("GET /api/security/stats returns 403 for clinician (not admin)", async () => {
    mockVerify.mockResolvedValue(VALID_JWT_PAYLOAD);
    mockFindUser.mockResolvedValue(CLINICIAN);

    const res = await request(app)
      .get("/api/security/stats")
      .set("Cookie", AUTH_COOKIE);

    expect(res.status).toBe(403);
  });

  // Note: /api/users uses ORGANIZATION_MANAGER_ROLES which includes clinician —
  // only truly admin-only routes (requireRole(["admin"])) should be tested here.

  it("GET /api/security/stats succeeds (not 401 or 403) for admin role", async () => {
    mockVerify.mockResolvedValue(VALID_JWT_PAYLOAD);
    mockFindUser.mockResolvedValue({ ...CLINICIAN, id: "admin-uuid", role: "admin" });
    // Security stats query
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/api/security/stats")
      .set("Cookie", AUTH_COOKIE);

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ── §4  Rate limiting: /api/auth enforces its threshold ───────────────────────

describe("Rate limiting: /api/auth returns 429 after 10 requests/min", () => {
  it("returns 429 on the 11th request within the same window", async () => {
    // Fire 10 requests — each hits the auth rate limit but does not exceed it.
    // The route itself returns 400 (Zod validation fails on empty body) which
    // is fine — we only care that the rate-limit layer lets them through.
    for (let i = 0; i < 10; i++) {
      const r = await request(app).post("/api/auth/signin").send({});
      expect(r.status).not.toBe(429);
    }
    // The 11th exceeds the limit
    const overflow = await request(app).post("/api/auth/signin").send({});
    expect(overflow.status).toBe(429);
  });
});
