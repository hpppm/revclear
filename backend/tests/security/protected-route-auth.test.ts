/**
 * Security Test: Protected route authentication and role enforcement
 *
 * Covers three areas:
 *
 * 1. Static analysis — every PHI route file imports authMiddleware and
 *    requireOrganization; admin-only routes import requireRole(['admin']).
 *    Reading the source rather than running HTTP ensures the guard is wired
 *    at the module level, not hidden behind conditional logic.
 *
 * 2. requireOrganization middleware — unit tests that verify:
 *    - 401 when req.user is absent (token passed but user unknown)
 *    - 400 when authenticated user has no organization
 *    - Attaches organization to req and calls next() on the happy path
 *
 * 3. requireRole middleware — role-based access control gate:
 *    - 403 when the user's role is not in the allowedRoles list
 *    - 401 when no user identity is present at all
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

import * as fs from "fs";
import * as path from "path";
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

const ROUTES_DIR = path.join(__dirname, "../../src/api/routes");
const readRoute = (name: string) =>
  fs.readFileSync(path.join(ROUTES_DIR, name), "utf-8");

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
// 1. Static analysis — middleware wiring on PHI routes
// ---------------------------------------------------------------------------

describe("PHI routes: authMiddleware is applied to every route", () => {
  const PHI_ROUTES = [
    "patients.ts",
    "encounters.ts",
    "claims.ts",
    "transcribe.ts",
    "soap.ts",
    "codes.ts",
    "me.ts",
  ];

  it.each(PHI_ROUTES)("%s imports authMiddleware", (file) => {
    const content = readRoute(file);
    expect(content).toMatch(/authMiddleware/);
  });
});

describe("PHI routes: requireOrganization guards all patient/encounter/claim routes", () => {
  const ORG_SCOPED_ROUTES = ["patients.ts", "encounters.ts", "claims.ts"];

  it.each(ORG_SCOPED_ROUTES)("%s imports requireOrganization", (file) => {
    const content = readRoute(file);
    expect(content).toMatch(/requireOrganization/);
  });

  it.each(ORG_SCOPED_ROUTES)(
    "%s applies requireOrganization to every router.get/post/put/delete handler",
    (file) => {
      const content = readRoute(file);
      // Count route registrations vs requireOrganization usages in handler args.
      // Every `router.<method>(` must be accompanied by requireOrganization.
      const routeCount = (content.match(/router\.(get|post|put|delete|patch)\(/g) || []).length;
      const orgGuardCount = (content.match(/requireOrganization/g) || []).length;
      // Each route has exactly one requireOrganization usage in its arg list.
      // There may also be one import — count only usages after the import line.
      const importLineEnd = content.indexOf("\n", content.indexOf("requireOrganization"));
      const afterImport = content.slice(importLineEnd);
      const guardUsages = (afterImport.match(/requireOrganization/g) || []).length;
      expect(guardUsages).toBe(routeCount);
    },
  );
});

describe("Admin-only routes: requireRole(['admin']) is applied", () => {
  it("organizations.ts: POST /invite uses requireRole(['admin'])", () => {
    const content = readRoute("organizations.ts");
    // The invite route specifically must have requireRole
    expect(content).toMatch(/\/invite.*requireRole|requireRole.*\/invite/s);
    // Confirm the pattern is present in the route registration
    const inviteRouteBlock = content.slice(content.indexOf("/invite"));
    expect(inviteRouteBlock).toMatch(/requireRole\(\["admin"\]\)/);
  });

  it("users.ts: all routes use requireRole(['admin'])", () => {
    const content = readRoute("users.ts");
    expect(content).toMatch(/requireRole\(\["admin"\]\)/);
    // Both GET / and GET /:cognitoId must be guarded
    const routeCount = (content.match(/router\.get\(/g) || []).length;
    const guardCount = (content.match(/requireRole\(\["admin"\]\)/g) || []).length;
    expect(guardCount).toBe(routeCount);
  });

  it("security.ts: GET /stats uses requireRole(['admin'])", () => {
    const content = readRoute("security.ts");
    expect(content).toMatch(/requireRole\(\[["']admin["']\]\)/);
  });

  it("users.ts: no route can be accessed without requireRole", () => {
    const content = readRoute("users.ts");
    // Verify requireRole is not conditionally applied — it should appear inline
    // on every router.get() registration, not after a conditional check.
    const registrations = [...content.matchAll(/router\.get\([^;]+;/gs)];
    for (const [match] of registrations) {
      expect(match).toMatch(/requireRole/);
    }
  });
});

describe("Admin-only routes: no inline isAdmin helper bypasses requireRole", () => {
  const ADMIN_ROUTE_FILES = ["security.ts", "users.ts"];

  it.each(ADMIN_ROUTE_FILES)("%s does not define a custom inline admin check", (file) => {
    const content = readRoute(file);
    expect(content).not.toMatch(/const isAdmin\s*=/);
    expect(content).not.toMatch(/if\s*\(\s*req\.user\.role\s*===\s*['"]admin['"]\s*\)/);
  });
});

// ---------------------------------------------------------------------------
// 2. requireOrganization middleware — unit tests
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
// 3. requireRole — role-based access control
// ---------------------------------------------------------------------------

describe("requireRole: blocks clinicians from admin endpoints", () => {
  const makeReq = (role?: string) => ({
    user: role ? { id: "u1", role } : undefined,
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
      user: { id: "u1", role: "clinician" },
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
