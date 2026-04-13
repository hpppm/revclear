/**
 * Security Test: Protected route authentication and role enforcement
 *
 * Covers two areas:
 *
 * 1. requireOrganization middleware — unit tests that verify:
 *    - 401 when req.user is absent (token passed but user unknown)
 *    - 400 when authenticated user has no organization
 *    - Attaches organization to req and calls next() on the happy path
 *
 * 2. requireRole middleware — role-based access control gate:
 *    - 403 when the user's role is not in the allowedRoles list
 *    - 401 when no user identity is present at all
 *
 * HTTP-level enforcement (routes returning 401/403) is covered by
 * integration/route-protection.test.ts.
 */

// ---------------------------------------------------------------------------
// Mocks — hoisted before imports
// ---------------------------------------------------------------------------

jest.mock("../../src/config/db", () => ({
  query: jest.fn(),
  findUserByCognitoId: jest.fn(),
  getClient: jest.fn(),
}));

jest.mock("../../src/utils/organization", () => ({
  getUserOrganization: jest.fn(),
  assignUserToOrganization: jest.fn(),
  getEffectiveOrganizationRole: jest.fn((user) =>
    user?.organization_id ? user?.role : undefined,
  ),
}));

jest.mock("aws-jwt-verify", () => ({
  CognitoJwtVerifier: {
    create: jest.fn(() => ({
      verify: jest.fn(),
      hydrate: jest.fn().mockResolvedValue(undefined),
    })),
  },
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { getUserOrganization } from "../../src/utils/organization";
import { requireRole } from "../../src/middleware/auth";

// requireOrganization is imported after mocks so getUserOrganization is already
// replaced by the mock when the module is first evaluated.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { requireOrganization } = require("../../src/middleware/context");

const mockGetUserOrganization = getUserOrganization as jest.Mock;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const MOCK_USER = {
  id: "user-uuid",
  email: "clinician@test.com",
  role: "clinician",
  organization_id: "org-uuid",
};

const MOCK_ORG = {
  id: "org-uuid",
  name: "Test Clinic",
};

// ---------------------------------------------------------------------------
// 1. requireOrganization middleware — unit tests
// ---------------------------------------------------------------------------

describe("requireOrganization: blocks unauthenticated requests", () => {
  beforeEach(() => jest.clearAllMocks());

  it("calls next(AppError 401) when req.user is not set", async () => {
    const req: any = {}; // no .user property
    const res = makeRes();
    const next = jest.fn();

    await requireOrganization(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeDefined();
    expect(err.statusCode).toBe(401);
    expect(mockGetUserOrganization).not.toHaveBeenCalled();
  });
});

describe("requireOrganization: blocks users without an organization", () => {
  beforeEach(() => jest.clearAllMocks());

  it("calls next(AppError 400) when getUserOrganization returns null", async () => {
    mockGetUserOrganization.mockResolvedValue(null);

    const req: any = { user: MOCK_USER };
    const res = makeRes();
    const next = jest.fn();

    await requireOrganization(req, res, next);

    expect(mockGetUserOrganization).toHaveBeenCalledWith(MOCK_USER.id);
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(400);
    // req.organization must NOT be set — guard must not grant partial access
    expect(req.organization).toBeUndefined();
  });
});

describe("requireOrganization: happy path attaches org and calls next()", () => {
  beforeEach(() => jest.clearAllMocks());

  it("attaches req.organization and calls next() with no arguments", async () => {
    mockGetUserOrganization.mockResolvedValue(MOCK_ORG);

    const req: any = { user: MOCK_USER };
    const res = makeRes();
    const next = jest.fn();

    await requireOrganization(req, res, next);

    expect(next).toHaveBeenCalledWith(); // no error
    expect(req.organization).toEqual(MOCK_ORG);
  });

  it("scopes organization lookup by req.user.id — not by any request parameter", async () => {
    mockGetUserOrganization.mockResolvedValue(MOCK_ORG);

    // An attacker might try to influence the org lookup by putting a foreign
    // organization ID in the request body or query params.
    const req: any = {
      user: MOCK_USER,
      body: { organization_id: "attacker-org-id" },
      query: { organization_id: "attacker-org-id" },
      params: { organization_id: "attacker-org-id" },
    };
    const res = makeRes();
    const next = jest.fn();

    await requireOrganization(req, res, next);

    // The middleware must only ever call getUserOrganization with the user's own id
    expect(mockGetUserOrganization).toHaveBeenCalledWith(MOCK_USER.id);
    expect(mockGetUserOrganization).toHaveBeenCalledTimes(1);
    // The attached organization comes from the DB lookup, not from the request
    expect(req.organization).toEqual(MOCK_ORG);
    expect(req.organization.id).toBe("org-uuid"); // not "attacker-org-id"
  });

  it("calls getUserOrganization with the authenticated user id (from token, not body)", async () => {
    mockGetUserOrganization.mockResolvedValue(MOCK_ORG);
    const req: any = { user: { ...MOCK_USER, id: "real-user-id" } };
    const res = makeRes();
    const next = jest.fn();

    await requireOrganization(req, res, next);

    expect(mockGetUserOrganization).toHaveBeenCalledWith("real-user-id");
  });
});

// ---------------------------------------------------------------------------
// 2. requireRole — role-based access control
// ---------------------------------------------------------------------------

describe("requireRole: blocks clinicians from admin endpoints", () => {
  const makeReq = (role?: string) => ({
    user: role ? { id: "u1", role, organization_id: "org-1" } : undefined,
    auth: role ? { cognitoRole: role } : undefined,
  });

  it("returns 403 when a clinician tries an admin-only endpoint", () => {
    const middleware = requireRole(["admin"]);
    const req = makeReq("clinician") as any;
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Forbidden" }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when a billing_staff user tries an admin-only endpoint", () => {
    const middleware = requireRole(["admin"]);
    const req = makeReq("billing_staff") as any;
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when there is no authenticated user at all", () => {
    const middleware = requireRole(["admin"]);
    const req = { user: undefined, auth: undefined } as any;
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() when user has an allowed role", () => {
    const middleware = requireRole(["admin"]);
    const req = makeReq("admin") as any;
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("accepts billing_staff on billing-specific routes", () => {
    const middleware = requireRole(["admin", "billing_staff"]);
    const req = makeReq("billing_staff") as any;
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("does not allow role escalation by passing an 'admin' string in cognitoRole when user.role is clinician", () => {
    // Edge case: req.user.role = clinician but req.auth.cognitoRole = admin.
    // requireRole must prefer req.user.role (DB-backed) over req.auth.cognitoRole.
    const middleware = requireRole(["admin"]);
    const req: any = {
      user: { id: "u1", role: "clinician", organization_id: "org-1" },
      auth: { cognitoRole: "admin" }, // attacker-supplied cognitive mismatch
    };
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    // With a real user present, req.user.role takes precedence.
    // clinician is not in ["admin"] → must be 403.
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
