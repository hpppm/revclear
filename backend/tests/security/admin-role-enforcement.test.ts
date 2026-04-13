/**
 * Security Test: Admin role enforcement on protected endpoints
 *
 * 1. requireRole middleware unit tests — DB-role takes precedence, correct
 *    status codes on allowed / forbidden / unauthenticated paths.
 *
 * 2. requireCapability middleware unit tests — per-role capability matrix is
 *    exercised directly without needing HTTP requests.
 *
 * HTTP-level enforcement (GET /api/security/stats returns 403 for clinician,
 * 200 for admin) is verified in integration/route-protection.test.ts.
 *
 * Source-text assertions that previously appeared here (codes.ts RETURNING *,
 * dev/status.ts requireRole wiring, security.ts inline-check absence) have
 * been removed. Source text checks pass even when the code path is dead.
 */

// Mock the DB module to avoid real DB connections in tests
jest.mock("../../src/config/db", () => ({
  query: jest.fn(),
  findUserByCognitoId: jest.fn(),
  createUser: jest.fn(),
}));

import { requireRole } from "../../src/middleware/auth";
import { canRoleAccess, requireCapability } from "../../src/middleware/authorization";

// --- requireRole middleware unit tests ---

describe("requireRole middleware", () => {
  const makeReq = (role?: string, organizationId = "org-1") => ({
    user: role ? { role, organization_id: organizationId } : undefined,
    auth: undefined,
  });

  const makeRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  it("calls next() when user has an allowed role", () => {
    const middleware = requireRole(["admin"]);
    const req = makeReq("admin") as any;
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 403 when user role is not in allowedRoles", () => {
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

  it("returns 401 when no user is present", () => {
    const middleware = requireRole(["admin"]);
    const req = { user: undefined, auth: undefined } as any;
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when user has no organization-scoped role", () => {
    const middleware = requireRole(["admin"]);
    const req = { user: { role: "admin", organization_id: null }, auth: undefined } as any;
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe("requireCapability middleware", () => {
  const makeReq = (role?: string, organizationId = "org-1") => ({
    user: role ? { role, organization_id: organizationId } : undefined,
    auth: undefined,
  });

  const makeRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  it("allows receptionist to write patients", () => {
    expect(canRoleAccess("receptionist" as any, "write_patients")).toBe(true);
  });

  it("denies nurse from writing patients", () => {
    expect(canRoleAccess("nurse" as any, "write_patients")).toBe(false);
  });

  it("allows nurse to manage encounters", () => {
    expect(canRoleAccess("nurse" as any, "manage_encounters")).toBe(true);
  });

  it("denies billing staff from managing encounters", () => {
    expect(canRoleAccess("billing_staff" as any, "manage_encounters")).toBe(false);
  });

  it("allows billing staff to manage claims", () => {
    expect(canRoleAccess("billing_staff" as any, "manage_claims")).toBe(true);
  });

  it("denies receptionist from clinical AI", () => {
    const middleware = requireCapability("use_clinical_ai");
    const req = makeReq("receptionist") as any;
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("allows clinician through capability middleware", () => {
    const middleware = requireCapability("manage_organization");
    const req = makeReq("clinician") as any;
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("requires organization membership for capability checks", () => {
    const middleware = requireCapability("use_clinical_ai");
    const req = makeReq("clinician", null as any) as any;
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

