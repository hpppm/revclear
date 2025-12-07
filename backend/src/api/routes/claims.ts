import { Router, Response } from "express";
import { authMiddleware } from "../../middleware/auth";
import { query } from "../../config/db";
import { CreateClaimSchema, UpdateClaimSchema, IdParamSchema } from "../../types/zod";
import { z } from "zod";
import { getAuthenticatedUser } from "../../utils/auth";
import { getUserOrganization } from "../../utils/organization";

const router = Router();

const sendValidationError = (res: Response, error: z.ZodError) => {
  return res.status(400).json({ success: false, errors: error.errors });
};

const requireUser = async (req: any, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ success: false, message: "User not authenticated" });
    return null;
  }
  return user;
};

const requireOrganization = async (user: any, res: Response) => {
  const organization = await getUserOrganization(user.id);
  if (!organization) {
    res.status(400).json({ success: false, message: "User must join or create an organization first" });
    return null;
  }
  return organization;
};

let claimColumnsCache: string[] | null = null;
const getClaimColumns = async () => {
  if (claimColumnsCache) return claimColumnsCache;
  const result = await query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'claims'`
  );
  claimColumnsCache = result.rows.map((r) => r.column_name);
  return claimColumnsCache;
};

// GET all claims (scoped to organization)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const organization = await requireOrganization(user, res);
    if (!organization) return;

    const result = await query(
      "SELECT * FROM claims WHERE (organization_id = $1 OR (organization_id IS NULL AND clinician_id = $2)) ORDER BY created_at DESC",
      [organization.id, user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Error fetching claims:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// GET claim by ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const organization = await requireOrganization(user, res);
    if (!organization) return;

    const parsedParams = IdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return sendValidationError(res, parsedParams.error);
    }
    const { id } = parsedParams.data;

    const result = await query(
      "SELECT * FROM claims WHERE id = $1 AND (organization_id = $2 OR (organization_id IS NULL AND clinician_id = $3))",
      [id, organization.id, user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Claim not found" });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("Error fetching claim by ID:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// CREATE a new claim
router.post("/", authMiddleware, async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const organization = await requireOrganization(user, res);
    if (!organization) return;

    const parsedBody = CreateClaimSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return sendValidationError(res, parsedBody.error);
    }
    const validatedData = parsedBody.data;
    const {
      encounter_id,
      diagnosis_codes,
      procedure_codes,
      total_amount,
      insurance_provider,
      status,
      rejection_reason,
      submission_date,
      payment_date,
      payer_id,
      payer_name,
      claim_type,
      submission_type,
      patient_responsibility,
      line_items,
      billing_provider,
      service_facility,
      rendering_provider,
      subscriber,
      subscriber_relationship,
      service_date_start,
      service_date_end,
    } = validatedData;

    // Check if encounter_id exists and belongs to org
    const encounterCheck = await query(
      "SELECT id, patient_id FROM encounters WHERE id = $1 AND (organization_id = $2 OR (organization_id IS NULL AND clinician_id = $3))",
      [encounter_id, organization.id, user.id]
    );
    if (encounterCheck.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Encounter not found" });
    }
    const encounterPatientId = encounterCheck.rows[0].patient_id;

    const availableColumns = await getClaimColumns();

    const columns = ["encounter_id", "clinician_id", "patient_id", "organization_id"];
    const values: any[] = [encounter_id, user.id, encounterPatientId, organization.id];
    const placeholders = ["$1", "$2", "$3", "$4"];
    let idx = 5;

    const optionalFields: Record<string, any> = {
      diagnosis_codes,
      procedure_codes,
      total_amount,
      insurance_provider,
      status,
      rejection_reason,
      submission_date,
      payment_date,
      payer_id,
      payer_name,
      claim_type,
      submission_type,
      patient_responsibility,
      line_items,
      billing_provider,
      service_facility,
      rendering_provider,
      subscriber,
      subscriber_relationship,
      service_date_start,
      service_date_end,
    };

    for (const [key, value] of Object.entries(optionalFields)) {
      if (value !== undefined && availableColumns.includes(key)) {
        columns.push(key);
        placeholders.push(`$${idx}`);

        // Handle line_items - convert to array if needed
        if (key === "line_items") {
          const arrayValue = Array.isArray(value) ? value : Object.values(value || {});
          values.push(JSON.stringify(arrayValue));
        }
        // Handle other JSONB fields
        else if (
          [
            "billing_provider",
            "service_facility",
            "rendering_provider",
            "subscriber",
          ].includes(key)
        ) {
          values.push(JSON.stringify(value));
        }
        // Handle array fields that might come as objects
        else if (["diagnosis_codes", "procedure_codes"].includes(key)) {
          const arrayValue = Array.isArray(value) ? value : Object.values(value || {});
          values.push(arrayValue);
        }
        // Handle all other fields
        else {
          values.push(value);
        }
        idx += 1;
      }
    }

    const insertQuery = `INSERT INTO claims (${columns.join(
      ", "
    )}) VALUES (${placeholders.join(
      ", "
    )}) RETURNING *`;
    const result = await query(insertQuery, values);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error);
    }
    console.error("Error creating claim:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// UPDATE a claim
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const organization = await requireOrganization(user, res);
    if (!organization) return;

    const parsedParams = IdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return sendValidationError(res, parsedParams.error);
    }

    const parsedBody = UpdateClaimSchema.safeParse(req.body);
    if (!parsedBody.success) {
      console.error("[PUT /claims/:id] Validation error:", JSON.stringify(parsedBody.error.issues, null, 2));
      return sendValidationError(res, parsedBody.error);
    }
    const validatedData = parsedBody.data;
    const { id } = parsedParams.data;

    const claimOwner = await query(
      "SELECT id FROM claims WHERE id = $1 AND (organization_id = $2 OR (organization_id IS NULL AND clinician_id = $3))",
      [id, organization.id, user.id]
    );
    if (claimOwner.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Claim not found" });
    }

    const availableColumns = await getClaimColumns();
    const entries = Object.entries(validatedData).filter(
      ([key, value]) => value !== undefined && availableColumns.includes(key)
    );

    if (entries.length === 0) {
      return res.status(400).json({ success: false, message: "No fields to update" });
    }

    const jsonFields = new Set([
      "line_items",
      "billing_provider",
      "service_facility",
      "rendering_provider",
      "subscriber",
    ]);

    const arrayFields = new Set([
      "diagnosis_codes",
      "procedure_codes",
    ]);

    // Convert object-formatted arrays back to proper arrays and serialize JSON fields
    const fields = entries.map(([fieldName], i) => `${fieldName} = $${i + 1}`).join(", ");
    const values = entries.map(([fieldName, value]) => {
      // Handle array fields that might come as objects with numeric keys
      if (arrayFields.has(fieldName)) {
        // Convert to array if it's an object
        const arrayValue = Array.isArray(value) ? value : Object.values(value || {});
        return arrayValue;
      }
      // Handle line_items specially - convert to array of objects
      if (fieldName === "line_items") {
        const arrayValue = Array.isArray(value) ? value : Object.values(value || {});
        return JSON.stringify(arrayValue);
      }
      // Handle other JSON fields
      if (jsonFields.has(fieldName)) {
        return JSON.stringify(value);
      }
      return value;
    });

    const result = await query(
      `UPDATE claims SET ${fields} WHERE id = $${values.length + 1} RETURNING *`,
      [...values, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Claim not found" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error);
    }
    console.error("Error updating claim:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// DELETE a claim
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const organization = await requireOrganization(user, res);
    if (!organization) return;

    const parsedParams = IdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return sendValidationError(res, parsedParams.error);
    }
    const { id } = parsedParams.data;
    const result = await query(
      "DELETE FROM claims WHERE id = $1 AND (organization_id = $2 OR (organization_id IS NULL AND clinician_id = $3)) RETURNING id",
      [id, organization.id, user.id]
    );

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Claim not found" });
    }

    res.json({ success: true, message: "Claim deleted successfully" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error);
    }
    console.error("Error deleting claim:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Helper functions for claim preview
const requireOwnedEncounter = async (encounterId: string, clinicianId: string) => {
  const result = await query(`SELECT * FROM encounters WHERE id = $1 AND clinician_id = $2`, [encounterId, clinicianId]);
  return result.rows[0] || null;
};

const getMedicalCodesByEncounter = async (encounter_id: string) => {
  const result = await query(
    `SELECT * FROM medical_codes WHERE encounter_id = $1 ORDER BY created_at ASC`,
    [encounter_id]
  );
  return result.rows;
};

const getClaimByEncounter = async (encounter_id: string, clinician_id?: string) => {
  const params: any[] = [encounter_id];
  let sql = `SELECT * FROM claims WHERE encounter_id = $1`;
  if (clinician_id) {
    sql += " AND clinician_id = $2";
    params.push(clinician_id);
  }
  sql += " ORDER BY created_at DESC LIMIT 1";
  const result = await query(sql, params);
  return result.rows[0];
};

/**
 * Build claim payload from encounter, patient, codes, organization, and user data
 * Data sources:
 * - Billing Provider: Organization billing profile
 * - Service Facility: Organization general info (with fallback to billing)
 * - Rendering Provider: User/clinician profile
 */
const buildClaimPayload = (
  encounter: any,
  patient: any,
  codes: any[],
  organization: any,
  clinician: any,
  subscriber?: any
) => {
  const dateOfService =
    encounter?.date_of_service
      ? new Date(encounter.date_of_service).toISOString().split("T")[0]
      : undefined;

  const icdCodes = codes.filter((c) => c.code_type === "ICD").map((c) => c.code);
  const cptCodes = codes.filter((c) => c.code_type === "CPT");

  const lineItems = cptCodes.map((c, index) => ({
    line_number: index + 1,
    procedure_code: c.code,
    modifiers: [],
    diagnosis_pointers: [1],
    units: 1,
    charge_amount: 150.0,
    place_of_service: encounter?.place_of_service || "11",
    date_of_service: dateOfService,
    description: c.description,
  }));

  const totalAmount = lineItems.reduce((sum, item) => sum + item.charge_amount, 0);

  // Billing Provider: Use organization billing profile
  const billingAddress = {
    street: organization?.billing_address_line1
      ? `${organization.billing_address_line1}${organization.billing_address_line2 ? ', ' + organization.billing_address_line2 : ''}`
      : "",
    city: organization?.billing_city || "",
    state: organization?.billing_state || "",
    zip: organization?.billing_postal_code || "",
  };

  const billingProvider = {
    name: organization?.billing_name || organization?.name || "",
    npi: organization?.billing_npi || organization?.npi || "",
    organization_npi: organization?.npi || "",
    tax_id: organization?.billing_tax_id || organization?.tax_id || "",
    phone: organization?.billing_phone || organization?.phone || "",
    taxonomy_code: clinician?.taxonomy_code || "",
    street: billingAddress.street,
    city: billingAddress.city,
    state: billingAddress.state,
    zip: billingAddress.zip,
    address: `${billingAddress.street} ${billingAddress.city} ${billingAddress.state} ${billingAddress.zip}`.trim(),
  };

  // Service Facility: Use organization general info, fallback to billing
  const facilityAddress = {
    street: organization?.address_line1
      ? `${organization.address_line1}${organization.address_line2 ? ', ' + organization.address_line2 : ''}`
      : billingAddress.street,
    city: organization?.city || billingAddress.city,
    state: organization?.state || billingAddress.state,
    zip: organization?.postal_code || billingAddress.zip,
  };

  const serviceFacility = {
    name: organization?.name || organization?.billing_name || "",
    npi: organization?.npi || organization?.billing_npi || "",
    place_of_service: encounter?.place_of_service || organization?.default_place_of_service || "11",
    phone: organization?.phone || organization?.billing_phone || "",
    street: facilityAddress.street,
    city: facilityAddress.city,
    state: facilityAddress.state,
    zip: facilityAddress.zip,
    address: `${facilityAddress.street} ${facilityAddress.city} ${facilityAddress.state} ${facilityAddress.zip}`.trim(),
  };

  // Rendering Provider: Use clinician/user profile
  const renderingProvider = {
    name: clinician?.full_name || "",
    npi: clinician?.npi || "",
    taxonomy_code: clinician?.taxonomy_code || "",
  };

  return {
    encounter_id: encounter.id,
    clinician_id: encounter.clinician_id,
    patient_id: encounter.patient_id,
    diagnosis_codes: icdCodes,
    procedure_codes: cptCodes.map((c) => c.code),
    total_amount: totalAmount,
    insurance_provider: patient.insurance_provider || "Unknown",
    status: "draft",
    payer_id: patient.insurance_payer_id || "PAYER001",
    payer_name: patient.insurance_provider || "Unknown Payer",
    claim_type: "professional",
    submission_type: "initial",
    patient_responsibility: 0,
    service_date_start: dateOfService,
    service_date_end: dateOfService,
    date_of_service: dateOfService,
    line_items: lineItems,
    billing_provider: billingProvider,
    service_facility: serviceFacility,
    rendering_provider: renderingProvider,
    subscriber_relationship: patient.insurance_relationship || "self",
    subscriber: subscriber || null,
  };
};

/**
 * GET /api/claims/encounter/:encounterId/preview
 * Build a claim payload without persisting it.
 */
router.get("/encounter/:encounterId/preview", authMiddleware, async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const organization = await requireOrganization(user, res);
    if (!organization) return;

    const parsedParams = IdParamSchema.safeParse({ id: req.params.encounterId });
    if (!parsedParams.success) {
      return sendValidationError(res, parsedParams.error);
    }
    const encounterId = parsedParams.data.id;

    // Check for existing claim
    const existing = await getClaimByEncounter(encounterId, user.id);
    if (existing) {
      return res.json({ success: true, data: existing });
    }

    const encounter = await requireOwnedEncounter(encounterId, user.id);
    if (!encounter) {
      return res.status(404).json({ success: false, message: "Encounter not found" });
    }

    // Get patient
    const patientResult = await query(
      `SELECT * FROM patients WHERE id = $1 AND (organization_id = $2 OR (organization_id IS NULL AND clinician_id = $3))`,
      [encounter.patient_id, organization.id, user.id]
    );
    if (patientResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }
    const patient = patientResult.rows[0];

    // Get medical codes
    const codes = await getMedicalCodesByEncounter(encounterId);
    if (codes.length === 0) {
      return res.status(200).json({
        success: false,
        requiresCodes: true,
        message: "No codes selected for this encounter. Add ICD/CPT codes before previewing.",
        data: null,
      });
    }

    // Get subscriber if needed
    let subscriber = null;
    if (patient.insurance_relationship && patient.insurance_relationship !== "self" && patient.subscriber_id) {
      const subRes = await query(`SELECT * FROM insurance_subscribers WHERE id = $1`, [patient.subscriber_id]);
      subscriber = subRes.rows[0] || null;
    }

    const payload = buildClaimPayload(encounter, patient, codes, organization, user, subscriber);
    return res.json({ success: true, data: payload });
  } catch (error: any) {
    console.error("[GET /claims/encounter/:encounterId/preview] error", error);
    res.status(500).json({ success: false, message: error.message || "Failed to build claim preview" });
  }
});

export default router;
