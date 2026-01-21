import { Router, Request, Response, NextFunction } from "express";
import { query } from "../../../config/db";
import { authMiddleware } from "../../../middleware/auth";
import { getAuthenticatedUser } from "../../../utils/auth";

type PatientInsertPayload = {
  full_name: string;
  dob?: string;
  gender?: string;
  phone?: string;
  email?: string;
  insurance_provider?: string;
  insurance_policy_number?: string;
  clinician_id?: string;
};

type PatientUpdatePayload = Partial<PatientInsertPayload>;

const router = Router();

// Protect all dev DB routes
router.use(authMiddleware);

// SECURITY: Admin-only middleware for dev patient CRUD routes
// These routes bypass organization_id scoping - restrict to admins only
const adminOnly = async (req: Request, res: Response, next: NextFunction) => {
  const user = await getAuthenticatedUser(req);
  if (!user || user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required for dev database operations",
    });
  }
  next();
};

router.get("/health", async (_req, res) => {
  try {
    const result = await query<{ ok: number }>("SELECT 1 as ok");
    const row = result.rows[0];
    res.json({
      success: true,
      message: "PostgreSQL connection successful",
      data: row,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

// Create patient (admin only - bypasses organization scoping)
router.post("/patients", adminOnly, async (req, res) => {
  const payload = req.body as PatientInsertPayload;
  if (!payload?.full_name) {
    return res.status(400).json({ success: false, message: "full_name is required" });
  }

  try {
    const insertQuery = `
      INSERT INTO patients (
        full_name, dob, gender, phone, email, insurance_provider, insurance_policy_number, clinician_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, full_name, dob, gender, phone, email, insurance_provider, insurance_policy_number, clinician_id, created_at;
    `;

    const values = [
      payload.full_name,
      payload.dob || null,
      payload.gender || null,
      payload.phone || null,
      payload.email || null,
      payload.insurance_provider || null,
      payload.insurance_policy_number || null,
      payload.clinician_id || null,
    ];

    const result = await query(insertQuery, values);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to create patient" });
  }
});

// Read patients (single by id or list) - admin only
router.get("/patients", adminOnly, async (req, res) => {
  const patientId = (req.query.patientId as string) || null;
  const limit = req.query.limit ? Number(req.query.limit) : 5;

  try {
    if (patientId) {
      const result = await query(
        `
          SELECT id, full_name, dob, gender, phone, email, insurance_provider, insurance_policy_number, clinician_id, created_at
          FROM patients
          WHERE id = $1
          LIMIT 1;
        `,
        [patientId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, message: "Patient not found" });
      }

      return res.json({ success: true, data: result.rows[0] });
    }

    const result = await query(
      `
        SELECT id, full_name, dob, gender, phone, email, insurance_provider, insurance_policy_number, clinician_id, created_at
        FROM patients
        ORDER BY created_at DESC
        LIMIT $1;
      `,
      [Number.isFinite(limit) && limit > 0 ? limit : 5]
    );

    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to read patients" });
  }
});

// Update patient (admin only - bypasses organization scoping)
router.put("/patients/:id", adminOnly, async (req, res) => {
  const patientId = req.params.id;
  const payload = req.body as PatientUpdatePayload;

  const allowedFields: (keyof PatientUpdatePayload)[] = [
    "full_name",
    "dob",
    "gender",
    "phone",
    "email",
    "insurance_provider",
    "insurance_policy_number",
    "clinician_id",
  ];

  const setFragments: string[] = [];
  const values: any[] = [patientId];

  allowedFields.forEach((field) => {
    if (payload[field] !== undefined) {
      values.push(payload[field]);
      setFragments.push(`${field} = $${values.length}`);
    }
  });

  if (setFragments.length === 0) {
    return res.status(400).json({ success: false, message: "No updatable fields provided" });
  }

  try {
    const updateQuery = `
      UPDATE patients
      SET ${setFragments.join(", ")}
      WHERE id = $1
      RETURNING id, full_name, dob, gender, phone, email, insurance_provider, insurance_policy_number, clinician_id, created_at;
    `;

    const result = await query(updateQuery, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to update patient" });
  }
});

// Delete patient (admin only - bypasses organization scoping)
router.delete("/patients/:id", adminOnly, async (req, res) => {
  const patientId = req.params.id;

  try {
    const result = await query(
      `
        DELETE FROM patients
        WHERE id = $1
        RETURNING id, full_name;
      `,
      [patientId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to delete patient" });
  }
});

export default router;
