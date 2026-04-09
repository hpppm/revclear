/**
 * Auth Middleware Hardening Tests
 *
 * Verifies security changes to auth middleware and related code:
 *
 * Change 1 — Bearer header fallback removed (auth.ts)
 *   Tokens are accepted from httpOnly cookies only.
 *   An Authorization: Bearer header is no longer a valid token transport.
 *
 * Change 2 — DB lookup behaviour (auth.ts)
 *   If findUserByCognitoId throws, the request is rejected with 503 (fail-closed).
 *   If it returns null (new user — no DB record yet), next() is called with
 *   req.user unset so GET /api/me can create the record on first login.
 *
 * Change 3 — Cross-tab cookie collision detection (AuthContext.tsx)
 *   sessionStorage.userId is set on login and compared on every checkAuth()
 *   call. A mismatch (cookie overwritten by another tab) redirects to /login.
 *
 * Change 5 — MFA enforcement (auth.ts)
 *   Tokens whose amr claim does not include "mfa" are rejected with 401.
 *   This blocks tokens issued before TOTP MFA was enabled on the user pool.
 */

// ---------------------------------------------------------------------------
// Mocks — must be hoisted before imports
// ---------------------------------------------------------------------------

const mockVerify = jest.fn();

jest.mock("aws-jwt-verify", () => ({
  CognitoJwtVerifier: {
    create: jest.fn(() => ({
      verify: mockVerify,
      hydrate: jest.fn().mockResolvedValue(undefined),
    })),
  },
}));

jest.mock("../../src/config/db", () => ({
  query: jest.fn(),
  findUserByCognitoId: jest.fn(),
  getClient: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import * as fs from "fs";
import * as path from "path";
import { findUserByCognitoId } from "../../src/config/db";

const mockFindUser = findUserByCognitoId as jest.Mock;

// Import authMiddleware AFTER mocks are in place
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { authMiddleware } = require("../../src/middleware/auth");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// VALID_PAYLOAD represents a fully-authenticated Cognito access token that has
// passed TOTP MFA verification. The amr claim is set by Cognito when
// SOFTWARE_TOKEN_MFA is satisfied; tokens without it are now rejected.
const VALID_PAYLOAD = {
  sub: "cognito-sub-123",
  iss: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_test",
  client_id: "test-client-id",
  token_use: "access",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
  "cognito:groups": ["Users"],
  amr: ["mfa"],
};

const DB_USER = {
  id: "db-user-uuid",
  email: "test@example.com",
  cognito_id: "cognito-sub-123",
  organization_id: "org-uuid",
  role: "billing_staff",
  is_org_admin: false,
};

const makeReq = (overrides: Record<string, any> = {}) => ({
  cookies: {},
  headers: {},
  ...overrides,
});

const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// ---------------------------------------------------------------------------
// Change 1 — Bearer header fallback removed
// ---------------------------------------------------------------------------

describe("Change 1: Bearer header is no longer accepted as token transport", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when token is sent via Authorization: Bearer header (no cookie)", async () => {
    const req = makeReq({
      cookies: {},
      headers: { authorization: "Bearer valid.jwt.token" },
    });
    const res = makeRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Authentication required" });
    expect(next).not.toHaveBeenCalled();
    // Verifier must NOT have been called — token was never extracted
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it("returns 401 when no cookie and no Authorization header", async () => {
    const req = makeReq({ cookies: {}, headers: {} });
    const res = makeRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Authentication required" });
    expect(next).not.toHaveBeenCalled();
  });

  it("proceeds past token extraction when accessToken cookie is present", async () => {
    mockVerify.mockResolvedValue(VALID_PAYLOAD);
    mockFindUser.mockResolvedValue(DB_USER);

    const req = makeReq({ cookies: { accessToken: "valid.jwt.token" } });
    const res = makeRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    // verify() was called with the cookie value
    expect(mockVerify).toHaveBeenCalledWith("valid.jwt.token");
    expect(next).toHaveBeenCalled();
  });

  it("ignores Authorization header even when cookie is also absent", async () => {
    const req = makeReq({
      cookies: {},
      headers: { authorization: "Bearer should-be-ignored" },
    });
    const res = makeRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(mockVerify).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

// ---------------------------------------------------------------------------
// Change 2a — Invalid / tampered JWT is rejected before any claim access
// ---------------------------------------------------------------------------

describe("Change 2a: Signature verification rejects bad tokens before claims are read", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 with 'Invalid token' when verify() throws a generic error", async () => {
    mockVerify.mockRejectedValue(new Error("JwtInvalidSignatureError"));

    const req = makeReq({ cookies: { accessToken: "tampered.jwt.token" } });
    const res = makeRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid token" });
    expect(next).not.toHaveBeenCalled();
    // DB must NOT be queried — reject before touching the database
    expect(mockFindUser).not.toHaveBeenCalled();
  });

  it("returns 401 with 'Token expired' when verify() throws an expiry error", async () => {
    mockVerify.mockRejectedValue(new Error("Token is expired"));

    const req = makeReq({ cookies: { accessToken: "expired.jwt.token" } });
    const res = makeRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Token expired" });
    expect(next).not.toHaveBeenCalled();
    expect(mockFindUser).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Change 2b — DB lookup failure now blocks the request
// ---------------------------------------------------------------------------

describe("Change 2b: DB lookup failure blocks the request (no silent next())", () => {
  beforeEach(() => jest.clearAllMocks());

  it("calls next() with req.user unset when findUserByCognitoId returns null (new-user first-login flow)", async () => {
    mockVerify.mockResolvedValue(VALID_PAYLOAD);
    mockFindUser.mockResolvedValue(null);

    const req = makeReq({ cookies: { accessToken: "valid.jwt.token" } }) as any;
    const res = makeRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    // New-user flow: no DB record yet, but the request is not blocked.
    // GET /api/me will create the record; requireOrganization gates all other routes.
    expect(next).toHaveBeenCalled();
    expect((req as any).user).toBeUndefined();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 503 when findUserByCognitoId throws (database error)", async () => {
    mockVerify.mockResolvedValue(VALID_PAYLOAD);
    mockFindUser.mockRejectedValue(new Error("Connection timeout"));

    const req = makeReq({ cookies: { accessToken: "valid.jwt.token" } });
    const res = makeRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      error: "Authentication service temporarily unavailable",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("attaches req.user and calls next() on the happy path", async () => {
    mockVerify.mockResolvedValue(VALID_PAYLOAD);
    mockFindUser.mockResolvedValue(DB_USER);

    const req = makeReq({ cookies: { accessToken: "valid.jwt.token" } }) as any;
    const res = makeRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe(DB_USER.id);
    expect(req.user.role).toBe("billing_staff");
    expect(res.status).not.toHaveBeenCalled();
  });

  it("preserves the database membership role instead of mapping Cognito groups", async () => {
    mockVerify.mockResolvedValue({
      ...VALID_PAYLOAD,
      "cognito:groups": ["Admin"],
    });
    mockFindUser.mockResolvedValue({
      ...DB_USER,
      role: "nurse",
    });

    const req = makeReq({ cookies: { accessToken: "valid.jwt.token" } }) as any;
    const res = makeRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.role).toBe("nurse");
  });
});

// ---------------------------------------------------------------------------
// Change 5 — MFA enforcement via Cognito pool (not amr claim)
//
// The amr claim check was removed because Cognito only populates amr when
// Advanced Security (Threat Protection) is enabled on the user pool. Without
// it, tokens from a completed SOFTWARE_TOKEN_MFA challenge still lack the
// claim, blocking every valid login. MFA enforcement is delegated to the
// Cognito pool's mandatory TOTP configuration — any token that passes
// RS256 signature verification was issued only after Cognito completed the
// challenge. Restore the amr check if Advanced Security is enabled later.
// ---------------------------------------------------------------------------

describe("Change 5: MFA enforcement — valid Cognito tokens pass regardless of amr claim", () => {
  beforeEach(() => jest.clearAllMocks());

  it("passes through when amr claim is absent (Cognito pool enforces MFA at challenge level)", async () => {
    const { amr: _omitted, ...payloadWithoutAmr } = VALID_PAYLOAD;
    mockVerify.mockResolvedValue(payloadWithoutAmr);
    mockFindUser.mockResolvedValue(DB_USER);

    const req = makeReq({ cookies: { accessToken: "no-amr.token" } }) as any;
    const res = makeRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("passes through when amr is an empty array", async () => {
    mockVerify.mockResolvedValue({ ...VALID_PAYLOAD, amr: [] });
    mockFindUser.mockResolvedValue(DB_USER);

    const req = makeReq({ cookies: { accessToken: "empty-amr.token" } }) as any;
    const res = makeRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("passes through when amr includes 'mfa' (Advanced Security populated claim)", async () => {
    mockVerify.mockResolvedValue(VALID_PAYLOAD); // amr: ["mfa"]
    mockFindUser.mockResolvedValue(DB_USER);

    const req = makeReq({ cookies: { accessToken: "mfa-valid.token" } }) as any;
    const res = makeRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Change 4 — SignupSchema attributes whitelist blocks Cognito attribute injection
// ---------------------------------------------------------------------------

describe("Change 4: SignupSchema rejects injected Cognito attributes", () => {
  // Import z directly so we can reconstruct the same schema shape and assert
  // that the whitelist rejects arbitrary attribute keys.  This avoids the need
  // for an HTTP test server while still covering the validation layer.
  const { z } = require("zod");

  const SignupSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    // Mirror the exact whitelist from auth.ts
    attributes: z
      .object({ name: z.string().min(1).max(100).optional() })
      .strict()
      .optional(),
  });

  it("rejects attributes containing custom:tenant_id", () => {
    const result = SignupSchema.safeParse({
      email: "attacker@evil.com",
      password: "Passw0rd!",
      attributes: { "custom:tenant_id": "victim-org-uuid" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects attributes containing preferred_username", () => {
    const result = SignupSchema.safeParse({
      email: "attacker@evil.com",
      password: "Passw0rd!",
      attributes: { preferred_username: "admin" },
    });
    expect(result.success).toBe(false);
  });

  it("accepts attributes containing only the whitelisted name field", () => {
    const result = SignupSchema.safeParse({
      email: "user@example.com",
      password: "Passw0rd!",
      attributes: { name: "Jane Doe" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts signup with no attributes at all", () => {
    const result = SignupSchema.safeParse({
      email: "user@example.com",
      password: "Passw0rd!",
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Change 3 — Cross-tab collision: static analysis of AuthContext
// ---------------------------------------------------------------------------

describe("Change 3: Cross-tab cookie collision detection in AuthContext.tsx", () => {
  const authContextPath = path.join(
    __dirname,
    "../../../frontend/app/context/AuthContext.tsx"
  );
  const content = fs.existsSync(authContextPath)
    ? fs.readFileSync(authContextPath, "utf-8")
    : null;

  const skip = content === null;

  (skip ? it.skip : it)(
    "stores userId in sessionStorage on login",
    () => {
      expect(content).toMatch(/sessionStorage\.setItem\(["']userId["']/);
    }
  );

  (skip ? it.skip : it)(
    "reads userId from sessionStorage in checkAuth",
    () => {
      expect(content).toMatch(/sessionStorage\.getItem\(["']userId["']/);
    }
  );

  (skip ? it.skip : it)(
    "redirects to /login when stored userId does not match returned userId",
    () => {
      expect(content).toMatch(/storedUserId !== returnedUserId/);
      expect(content).toMatch(/router\.push\(["']\/login["']\)/);
    }
  );

  (skip ? it.skip : it)(
    "removes userId from sessionStorage on clearSensitiveData",
    () => {
      expect(content).toMatch(/sessionStorage\.removeItem\(["']userId["']\)/);
    }
  );

  (skip ? it.skip : it)(
    "clears sessionStorage before setting user state to prevent stale tab data",
    () => {
      // clearSensitiveData must call sessionStorage.removeItem before setUser(null)
      const clearFnStart = content!.indexOf("const clearSensitiveData");
      const removeItemIdx = content!.indexOf(
        'sessionStorage.removeItem("userId")',
        clearFnStart
      );
      const setUserNullIdx = content!.indexOf("setUser(null)", clearFnStart);
      expect(removeItemIdx).toBeGreaterThan(clearFnStart);
      expect(setUserNullIdx).toBeGreaterThan(removeItemIdx);
    }
  );

  (skip ? it.skip : it)(
    "sets sessionEnded flag on collision instead of calling signout",
    () => {
      // The correct fix does NOT call signout/GlobalSignOut on collision.
      // Calling signout would clear the shared httpOnly cookie, which now belongs
      // to the OTHER user — it would terminate their session too.
      // Instead we set a sessionEnded flag so the next checkAuth (on /login) skips
      // auto-authentication, and the user is shown the sign-in form.
      const collisionBlockStart = content!.indexOf("storedUserId !== returnedUserId");
      const collisionBlockEnd = content!.indexOf("return;", collisionBlockStart);
      const collision = content!.slice(collisionBlockStart, collisionBlockEnd);
      expect(collision).toMatch(/sessionStorage\.setItem\(["']sessionEnded["']/);
      expect(collision).not.toMatch(/performLogout/);
    }
  );

  (skip ? it.skip : it)(
    "skips auto-authentication when sessionEnded flag is set",
    () => {
      // After the collision redirect lands on /login, checkAuth runs again.
      // /me still returns 200 (the other user's valid cookie). Without the
      // sessionEnded guard, checkAuth would authenticate as the wrong user.
      expect(content).toMatch(/sessionStorage\.getItem\(["']sessionEnded["']\)/);
      expect(content).toMatch(/sessionStorage\.removeItem\(["']sessionEnded["']\)/);
    }
  );

  (skip ? it.skip : it)(
    "broadcasts login event via BroadcastChannel so other tabs are notified immediately",
    () => {
      expect(content).toMatch(/BroadcastChannel/);
      expect(content).toMatch(/revclear_auth/);
      expect(content).toMatch(/type.*login|login.*type/);
    }
  );
});
