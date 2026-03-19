import type { Router } from "express";

const authMiddleware = jest.fn((req: any, res: any, next: any) => {
  const userId = req.headers["x-test-user-id"];
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  req.user = {
    id: userId,
    role: req.headers["x-test-role"] || "clinician",
  };
  next();
});

const requireOrganization = jest.fn((req: any, res: any, next: any) => {
  const orgId = req.headers["x-test-org-id"];
  if (!orgId) {
    return res.status(400).json({
      success: false,
      message: "Organization context missing",
    });
  }

  req.organization = { id: orgId };
  next();
});

const patientService = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  upsertSubscriber: jest.fn(),
  getSubscriber: jest.fn(),
};

const encounterService = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const claimService = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  getPreview: jest.fn(),
};

jest.mock("../../src/middleware/auth", () => ({
  authMiddleware,
}));

jest.mock("../../src/middleware/context", () => ({
  requireOrganization,
}));

jest.mock("../../src/services/patientService", () => ({
  PatientService: patientService,
}));

jest.mock("../../src/services/encounterService", () => ({
  EncounterService: encounterService,
}));

jest.mock("../../src/services/claimService", () => ({
  ClaimService: claimService,
}));

const patientRoutes = require("../../src/api/routes/patients").default as Router;
const encounterRoutes = require("../../src/api/routes/encounters").default as Router;
const claimRoutes = require("../../src/api/routes/claims").default as Router;

const makeRes = () => {
  const res: any = {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    set(field: string, value: string) {
      this.headers[field] = value;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };

  return res;
};

const invokeRoute = async (
  router: any,
  method: string,
  path: string,
  options: {
    body?: any;
    query?: Record<string, any>;
    headers?: Record<string, string>;
  } = {},
) => {
  const layer = router.stack.find(
    (entry: any) =>
      entry.route &&
      entry.route.methods[method] &&
      entry.match(path),
  );

  if (!layer) {
    throw new Error(`No ${method.toUpperCase()} route matched ${path}`);
  }

  const req: any = {
    method: method.toUpperCase(),
    url: path,
    path,
    params: layer.params || {},
    query: options.query || {},
    body: options.body,
    headers: options.headers || {},
    header(name: string) {
      return this.headers[name.toLowerCase()];
    },
    get(name: string) {
      return this.header(name);
    },
  };

  const res = makeRes();
  let error: any;

  const stack = layer.route.stack.map((entry: any) => entry.handle);

  const run = async (index: number): Promise<void> => {
    if (index >= stack.length || res.body !== undefined) {
      return;
    }

    const handler = stack[index];
    const next = (err?: any) => {
      if (err) {
        error = err;
        return;
      }
      return run(index + 1);
    };

    const result = handler(req, res, next);
    if (result && typeof result.then === "function") {
      await result;
    }

    if (
      !error &&
      res.body === undefined &&
      handler.length < 3 &&
      index + 1 < stack.length
    ) {
      await run(index + 1);
    }
  };

  await run(0);

  if (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }

  return {
    status: res.statusCode,
    body: res.body,
  };
};

const authHeaders = {
  "x-test-user-id": "clin-123",
  "x-test-org-id": "org-789",
};

describe("route contract integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("patients routes", () => {
    it("returns 401 before hitting the service when auth is missing", async () => {
      const result = await invokeRoute(patientRoutes, "get", "/", {
        query: {},
      });

      expect(result.status).toBe(401);
      expect(result.body).toEqual({
        success: false,
        message: "Unauthorized",
      });
      expect(patientService.findAll).not.toHaveBeenCalled();
    });

    it("normalizes pagination and passes org/user context into PatientService.findAll", async () => {
      patientService.findAll.mockResolvedValueOnce({
        data: [{ id: "pat-1", full_name: "Jane Doe" }],
        total: 1,
      });

      const result = await invokeRoute(patientRoutes, "get", "/", {
        query: { limit: "500", offset: "-10" },
        headers: authHeaders,
      });

      expect(result.status).toBe(200);
      expect(patientService.findAll).toHaveBeenCalledWith(
        "org-789",
        "clin-123",
        { limit: 100, offset: 0 },
      );
      expect(result.body).toEqual({
        success: true,
        data: [{ id: "pat-1", full_name: "Jane Doe" }],
        pagination: { limit: 100, offset: 0, total: 1, hasMore: false },
      });
    });

    it("rejects invalid patient payloads before calling PatientService.create", async () => {
      const result = await invokeRoute(patientRoutes, "post", "/", {
        headers: authHeaders,
        body: { full_name: "" },
      });

      expect(result.status).toBe(400);
      expect(result.body.success).toBe(false);
      expect(result.body.errors).toBeInstanceOf(Array);
      expect(patientService.create).not.toHaveBeenCalled();
    });

    it("returns 201 and preserves the route response envelope for valid patient creation", async () => {
      patientService.create.mockResolvedValueOnce({
        id: "pat-2",
        full_name: "John Doe",
        clinician_id: "clin-123",
      });

      const result = await invokeRoute(patientRoutes, "post", "/", {
        headers: authHeaders,
        body: {
          full_name: "John Doe",
          dob: "1980-01-01",
        },
      });

      expect(result.status).toBe(201);
      expect(patientService.create).toHaveBeenCalledWith(
        { full_name: "John Doe", dob: "1980-01-01" },
        "org-789",
        "clin-123",
      );
      expect(result.body).toEqual({
        success: true,
        data: {
          id: "pat-2",
          full_name: "John Doe",
          clinician_id: "clin-123",
        },
      });
    });
  });

  describe("encounter routes", () => {
    it("passes patient_id filters and pagination into EncounterService.findAll", async () => {
      encounterService.findAll.mockResolvedValueOnce({
        data: [{ id: "enc-1", patient_id: "pat-1" }],
        total: 1,
      });

      const result = await invokeRoute(encounterRoutes, "get", "/", {
        query: { patient_id: "pat-1", limit: "25", offset: "5" },
        headers: authHeaders,
      });

      expect(result.status).toBe(200);
      expect(encounterService.findAll).toHaveBeenCalledWith(
        "org-789",
        "clin-123",
        { limit: 25, offset: 5, patientId: "pat-1" },
      );
      expect(result.body.pagination).toEqual({
        limit: 25,
        offset: 5,
        total: 1,
        hasMore: false,
      });
    });

    it("returns 404 with the existing response contract when EncounterService.findById returns null", async () => {
      encounterService.findById.mockResolvedValueOnce(null);

      const result = await invokeRoute(
        encounterRoutes,
        "get",
        "/550e8400-e29b-41d4-a716-446655440000",
        { headers: authHeaders },
      );

      expect(result.status).toBe(404);
      expect(encounterService.findById).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440000",
        "org-789",
        "clin-123",
      );
      expect(result.body).toEqual({
        success: false,
        message: "Encounter not found",
      });
    });
  });

  describe("claim routes", () => {
    it("rejects invalid claim payloads before ClaimService.create runs", async () => {
      const result = await invokeRoute(claimRoutes, "post", "/", {
        headers: authHeaders,
        body: { encounter_id: "not-a-uuid" },
      });

      expect(result.status).toBe(400);
      expect(result.body.success).toBe(false);
      expect(result.body.errors).toBeInstanceOf(Array);
      expect(claimService.create).not.toHaveBeenCalled();
    });

    it("returns claim preview data through the existing success envelope", async () => {
      claimService.getPreview.mockResolvedValueOnce({
        encounter_id: "enc-99",
        billing_provider: { name: "Clinic Billing" },
        subscriber: { full_name: "Jane Doe" },
      });

      const result = await invokeRoute(
        claimRoutes,
        "get",
        "/encounter/550e8400-e29b-41d4-a716-446655440000/preview",
        { headers: authHeaders },
      );

      expect(result.status).toBe(200);
      expect(claimService.getPreview).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440000",
        { id: "org-789" },
        { id: "clin-123", role: "clinician" },
      );
      expect(result.body).toEqual({
        success: true,
        data: {
          encounter_id: "enc-99",
          billing_provider: { name: "Clinic Billing" },
          subscriber: { full_name: "Jane Doe" },
        },
      });
    });
  });
});
