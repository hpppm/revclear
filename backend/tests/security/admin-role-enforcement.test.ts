/**
 * Security Test: Admin role enforcement on protected endpoints
 *
 * Verifies that:
 * 1. GET /api/security/stats uses requireRole middleware (not inline helper)
 * 2. GET /api/dev/status requires admin role
 * 3. codes.ts does not use RETURNING * (data minimization policy)
 */

// Mock the DB module to avoid real DB connections in tests
jest.mock("../../src/config/db", () => ({
  query: jest.fn(),
  findUserByCognitoId: jest.fn(),
  createUser: jest.fn(),
}));

import { requireRole } from "../../src/middleware/auth";

// --- requireRole middleware unit tests ---

describe("requireRole middleware", () => {
  const makeReq = (role?: string) => ({
    user: role ? { role } : undefined,
    auth: role ? { cognitoRole: role } : undefined,
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

  it("returns 401 when no user/auth is present", () => {
    const middleware = requireRole(["admin"]);
    const req = { user: undefined, auth: undefined } as any;
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("falls back to cognitoRole when req.user is absent", () => {
    const middleware = requireRole(["admin"]);
    const req = { user: undefined, auth: { cognitoRole: "admin" } } as any;
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

// --- Data minimization: codes.ts RETURNING * check ---

describe("codes.ts data minimization", () => {
  it("does not use RETURNING * in saveMedicalCode", () => {
    const fs = require("fs");
    const path = require("path");
    const codesPath = path.join(__dirname, "../../src/api/routes/codes.ts");
    const content = fs.readFileSync(codesPath, "utf-8");

    // Should NOT have bare RETURNING *
    expect(content).not.toMatch(/RETURNING \*/);
    // Should have explicit column list
    expect(content).toMatch(/MEDICAL_CODE_COLUMNS/);
  });
});

// --- dev/status.ts admin check ---

describe("dev/status.ts admin protection", () => {
  it("uses requireRole middleware to restrict AWS config access to admins", () => {
    const fs = require("fs");
    const path = require("path");
    const statusPath = path.join(
      __dirname,
      "../../src/api/routes/dev/status.ts",
    );
    const content = fs.readFileSync(statusPath, "utf-8");

    // Should use requireRole(['admin']) consistent with RBAC patterns
    expect(content).toMatch(/requireRole\(\[["']admin["']\]\)/);
    // Should NOT have a custom adminOnly helper (avoids duplicate logic)
    expect(content).not.toMatch(/const adminOnly/);
  });
});

// --- security.ts uses requireRole, not inline isAdmin helper ---

describe("security.ts admin check", () => {
  it("uses requireRole middleware instead of inline isAdmin helper", () => {
    const fs = require("fs");
    const path = require("path");
    const securityPath = path.join(
      __dirname,
      "../../src/api/routes/security.ts",
    );
    const content = fs.readFileSync(securityPath, "utf-8");

    // Should NOT have inline isAdmin helper
    expect(content).not.toMatch(/const isAdmin/);
    // Should use requireRole
    expect(content).toMatch(/requireRole\(\[["']admin["']\]\)/);
  });
});
