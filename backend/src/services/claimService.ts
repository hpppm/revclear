import { query } from "../config/db";
import { AppError } from "../utils/AppError";
import {
  decryptPHIJsonFields,
  encryptPHIJson,
} from "../utils/crypto";
import { decryptPatientRow, decryptSubscriberRow } from "./patientService";
import { submitClaimToClearinghouse } from "./clearinghouseService";
import { buildEdi837String, encryptEdiExport, validateClaimCodes } from "./ediService";

interface PaginationOptions {
  limit?: number;
  offset?: number;
}

// Explicit column list for claim queries - data minimization security measure
const CLAIM_SELECT_COLUMNS = `
    id, encounter_id, patient_id, clinician_id, organization_id,
    diagnosis_codes, procedure_codes, total_amount, insurance_provider,
    status, rejection_reason, submission_date, payment_date,
    payer_id, payer_name, claim_type, submission_type, patient_responsibility,
    line_items, billing_provider, service_facility, rendering_provider,
    subscriber, subscriber_relationship, service_date_start, service_date_end,
    created_at, updated_at
`
  .replace(/\s+/g, " ")
  .trim();

const CLAIM_ENCRYPTED_JSON_FIELDS = [
  "billing_provider",
  "service_facility",
  "rendering_provider",
  "subscriber",
] as const;

const CLAIM_ENCRYPTED_JSON_FIELD_SET = new Set<string>(CLAIM_ENCRYPTED_JSON_FIELDS);

const serializeClaimValue = (fieldName: string, value: any) => {
  if (fieldName === "line_items") {
    const arrayValue = Array.isArray(value) ? value : Object.values(value || {});
    return JSON.stringify(arrayValue);
  }

  if (CLAIM_ENCRYPTED_JSON_FIELD_SET.has(fieldName)) {
    return encryptPHIJson(value);
  }

  if (["diagnosis_codes", "procedure_codes"].includes(fieldName)) {
    return Array.isArray(value) ? value : Object.values(value || {});
  }

  return value;
};

const decryptClaimRow = <T extends Record<string, any> | null>(claim: T): T => {
  return decryptPHIJsonFields(claim, CLAIM_ENCRYPTED_JSON_FIELDS) as T;
};

export class ClaimService {
  private static async getClaimColumns() {
    const result = await query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'claims'`,
    );
    return result.rows.map((r: { column_name: string }) => r.column_name);
  }

  static async findAll(
    organizationId: string,
    clinicianId: string,
    options?: PaginationOptions,
  ) {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const countResult = await query(
      "SELECT COUNT(*) as total FROM claims WHERE (organization_id = $1 OR (organization_id IS NULL AND clinician_id = $2))",
      [organizationId, clinicianId],
    );
    const total = parseInt(countResult.rows[0].total);

    const result = await query(
      `SELECT ${CLAIM_SELECT_COLUMNS} FROM claims WHERE (organization_id = $1 OR (organization_id IS NULL AND clinician_id = $2)) ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
      [organizationId, clinicianId, limit, offset],
    );
    return { data: result.rows.map((row) => decryptClaimRow(row)), total };
  }

  static async findById(
    id: string,
    organizationId: string,
    clinicianId: string,
  ) {
    const result = await query(
      `SELECT ${CLAIM_SELECT_COLUMNS} FROM claims WHERE id = $1 AND (organization_id = $2 OR (organization_id IS NULL AND clinician_id = $3))`,
      [id, organizationId, clinicianId],
    );
    return decryptClaimRow(result.rows[0] || null);
  }

  static async create(data: any, organizationId: string, clinicianId: string) {
    // Check if encounter_id exists and belongs to org
    const encounterCheck = await query(
      "SELECT id, patient_id FROM encounters WHERE id = $1 AND (organization_id = $2 OR (organization_id IS NULL AND clinician_id = $3))",
      [data.encounter_id, organizationId, clinicianId],
    );
    if (encounterCheck.rows.length === 0) {
      throw new AppError("Encounter not found", 404);
    }
    const encounterPatientId = encounterCheck.rows[0].patient_id;

    const availableColumns = await this.getClaimColumns();

    const columns = [
      "encounter_id",
      "clinician_id",
      "patient_id",
      "organization_id",
    ];
    const values: any[] = [
      data.encounter_id,
      clinicianId,
      encounterPatientId,
      organizationId,
    ];
    const placeholders = ["$1", "$2", "$3", "$4"];
    let idx = 5;

    const optionalFields: Record<string, any> = {
      diagnosis_codes: data.diagnosis_codes,
      procedure_codes: data.procedure_codes,
      total_amount: data.total_amount,
      insurance_provider: data.insurance_provider,
      status: data.status,
      rejection_reason: data.rejection_reason,
      submission_date: data.submission_date,
      payment_date: data.payment_date,
      payer_id: data.payer_id,
      payer_name: data.payer_name,
      claim_type: data.claim_type,
      submission_type: data.submission_type,
      patient_responsibility: data.patient_responsibility,
      line_items: data.line_items,
      billing_provider: data.billing_provider,
      service_facility: data.service_facility,
      rendering_provider: data.rendering_provider,
      subscriber: data.subscriber,
      subscriber_relationship: data.subscriber_relationship,
      service_date_start: data.service_date_start,
      service_date_end: data.service_date_end,
    };

    for (const [key, value] of Object.entries(optionalFields)) {
      if (value !== undefined && availableColumns.includes(key)) {
        columns.push(key);
        placeholders.push(`$${idx}`);
        values.push(serializeClaimValue(key, value));
        idx += 1;
      }
    }

    const insertQuery = `INSERT INTO claims (${columns.join(
      ", ",
    )}) VALUES (${placeholders.join(", ")}) RETURNING ${CLAIM_SELECT_COLUMNS}`;
    const result = await query(insertQuery, values);
    return decryptClaimRow(result.rows[0]);
  }

  static async update(
    id: string,
    data: any,
    organizationId: string,
    clinicianId: string,
  ) {
    const claimOwner = await query(
      "SELECT id FROM claims WHERE id = $1 AND (organization_id = $2 OR (organization_id IS NULL AND clinician_id = $3))",
      [id, organizationId, clinicianId],
    );
    if (claimOwner.rows.length === 0) {
      throw new AppError("Claim not found", 404);
    }

    const availableColumns = await this.getClaimColumns();
    const entries = Object.entries(data).filter(
      ([key, value]) => value !== undefined && availableColumns.includes(key),
    );

    if (entries.length === 0) {
      throw new AppError("No fields to update", 400);
    }

    const fields = entries
      .map(([fieldName], i) => `${fieldName} = $${i + 1}`)
      .join(", ");
    const values = entries.map(([fieldName, value]) =>
      serializeClaimValue(fieldName, value),
    );

    const result = await query(
      `UPDATE claims SET ${fields} WHERE id = $${values.length + 1} RETURNING ${CLAIM_SELECT_COLUMNS}`,
      [...values, id],
    );

    if (result.rows.length === 0) {
      throw new AppError("Claim not found", 404);
    }

    return decryptClaimRow(result.rows[0]);
  }

  // ─── Submit claim to clearinghouse ────────────────────────────────────────

  static async submit(id: string, organizationId: string, clinicianId: string) {
    const claim = await this.findById(id, organizationId, clinicianId);
    if (!claim) throw new AppError("Claim not found", 404);

    if (claim.status === "accepted" || claim.status === "paid") {
      throw new AppError("Claim has already been accepted or paid", 400);
    }

    // Validate CPT and ICD-10 codes before submitting
    const codeErrors = validateClaimCodes(claim);
    if (codeErrors.length > 0) {
      throw new AppError(`Claim has invalid codes: ${codeErrors.join("; ")}`, 400);
    }

    // Send to clearinghouse
    const response = await submitClaimToClearinghouse(claim);

    // Map clearinghouse response to our status
    const newStatus =
      response.status === "accepted"
        ? "submitted"
        : response.status === "denied"
        ? "denied"
        : "in_progress";

    // Update claim status and submission date
    await query(
      `UPDATE claims SET status = $1, rejection_reason = $2, submission_date = NOW() WHERE id = $3`,
      [newStatus, response.reason || null, id],
    );

    // Record in claim_status_history
    await this.recordStatusHistory(id, newStatus, response.reason);

    return {
      status: newStatus,
      reason: response.reason,
      transactionId: response.transactionId,
    };
  }

  // ─── Record status change ──────────────────────────────────────────────────

  static async recordStatusHistory(claimId: string, status: string, reason?: string) {
    await query(
      `INSERT INTO claim_status_history (claim_id, status, reason) VALUES ($1, $2, $3)`,
      [claimId, status, reason || null],
    );
  }

  // ─── Get status history ────────────────────────────────────────────────────

  static async getStatusHistory(id: string, organizationId: string, clinicianId: string) {
    const claim = await this.findById(id, organizationId, clinicianId);
    if (!claim) throw new AppError("Claim not found", 404);

    const result = await query(
      `SELECT id, claim_id, status, reason, changed_at
       FROM claim_status_history
       WHERE claim_id = $1
       ORDER BY changed_at ASC`,
      [id],
    );
    return result.rows;
  }

  // ─── Download encrypted EDI 837 file ──────────────────────────────────────

  static async downloadEdi(id: string, organizationId: string, clinicianId: string) {
    const claim = await this.findById(id, organizationId, clinicianId);
    if (!claim) throw new AppError("Claim not found", 404);

    const ediString = buildEdi837String(claim);
    const encrypted = encryptEdiExport(ediString);
    return { encrypted, claimId: id };
  }

  static async delete(id: string, organizationId: string, clinicianId: string) {
    const result = await query(
      "DELETE FROM claims WHERE id = $1 AND (organization_id = $2 OR (organization_id IS NULL AND clinician_id = $3)) RETURNING id",
      [id, organizationId, clinicianId],
    );

    if (result.rowCount === 0) {
      throw new AppError("Claim not found", 404);
    }
    return true;
  }

  static async getPreview(encounterId: string, organization: any, user: any) {
    // Check for existing claim
    const existing = await this.getClaimByEncounter(
      encounterId,
      user.id,
      organization.id,
    );
    if (existing) {
      return existing;
    }

    const encounter = await this.requireOwnedEncounter(
      encounterId,
      user.id,
      organization.id,
    );
    if (!encounter) {
      throw new AppError("Encounter not found", 404);
    }

    // Get patient - select only fields needed for claim generation
    const patientResult = await query(
      `SELECT id, full_name, dob, gender, phone, email,
                    address_street, address_city, address_state, address_zip,
                    insurance_provider, insurance_policy_number, insurance_member_id,
                    insurance_group_number, insurance_payer_id, insurance_payer_name,
                    insurance_relationship, subscriber_id, plan_name
             FROM patients WHERE id = $1 AND (organization_id = $2 OR (organization_id IS NULL AND clinician_id = $3))`,
      [encounter.patient_id, organization.id, user.id],
    );
    if (patientResult.rows.length === 0) {
      throw new AppError("Patient not found", 404);
    }
    const patient = decryptPatientRow(patientResult.rows[0]);

    // Get medical codes
    const codes = await this.getMedicalCodesByEncounter(encounterId);
    if (codes.length === 0) {
      throw new AppError(
        "No codes selected for this encounter. Add ICD/CPT codes before previewing.",
        400,
      );
    }

    // Get subscriber if needed
    let subscriber = null;
    if (
      patient.insurance_relationship &&
      patient.insurance_relationship !== "self" &&
      patient.subscriber_id
    ) {
      const subRes = await query(
        `SELECT id, patient_id, full_name, dob, gender, phone,
                        address_street, address_city, address_state, address_zip,
                        member_id, group_number, plan_name
                 FROM insurance_subscribers WHERE id = $1`,
        [patient.subscriber_id],
      );
      subscriber = decryptSubscriberRow(subRes.rows[0] || null);
    }

    return this.buildClaimPayload(
      encounter,
      patient,
      codes,
      organization,
      user,
      subscriber,
    );
  }

  private static async getClaimByEncounter(
    encounter_id: string,
    clinician_id?: string,
    organization_id?: string,
  ) {
    const params: any[] = [encounter_id];
    let sql = `SELECT ${CLAIM_SELECT_COLUMNS} FROM claims WHERE encounter_id = $1`;
    if (organization_id && clinician_id) {
      sql += " AND (organization_id = $2 OR (organization_id IS NULL AND clinician_id = $3))";
      params.push(organization_id, clinician_id);
    } else if (clinician_id) {
      sql += " AND clinician_id = $2";
      params.push(clinician_id);
    }
    sql += " ORDER BY created_at DESC LIMIT 1";
    const result = await query(sql, params);
    return decryptClaimRow(result.rows[0] || null);
  }

  private static async requireOwnedEncounter(
    encounterId: string,
    clinicianId: string,
    organizationId?: string,
  ) {
    const result = await query(
      `SELECT id, patient_id, clinician_id, organization_id, date_of_service, status, place_of_service
             FROM encounters WHERE id = $1 AND (organization_id = $2 OR (organization_id IS NULL AND clinician_id = $3))`,
      [encounterId, organizationId || null, clinicianId],
    );
    return result.rows[0] || null;
  }

  private static async getMedicalCodesByEncounter(encounter_id: string) {
    const result = await query(
      `SELECT id, encounter_id, code, code_type, description, category, confidence_score, is_ai_suggested, created_at
             FROM medical_codes WHERE encounter_id = $1 ORDER BY created_at ASC`,
      [encounter_id],
    );
    return result.rows;
  }

  private static buildClaimPayload(
    encounter: any,
    patient: any,
    codes: any[],
    organization: any,
    clinician: any,
    subscriber?: any,
  ) {
    const dateOfService = encounter?.date_of_service
      ? new Date(encounter.date_of_service).toISOString().split("T")[0]
      : undefined;

    const icdCodes = codes
      .filter((c) => c.code_type === "ICD")
      .map((c) => c.code);
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

    const totalAmount = lineItems.reduce(
      (sum, item) => sum + item.charge_amount,
      0,
    );

    // Billing Provider: Use organization billing profile
    const billingAddress = {
      street: organization?.billing_address_line1
        ? `${organization.billing_address_line1}${organization.billing_address_line2 ? ", " + organization.billing_address_line2 : ""}`
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
      address:
        `${billingAddress.street} ${billingAddress.city} ${billingAddress.state} ${billingAddress.zip}`.trim(),
    };

    // Service Facility: Use organization general info, fallback to billing
    const facilityAddress = {
      street: organization?.address_line1
        ? `${organization.address_line1}${organization.address_line2 ? ", " + organization.address_line2 : ""}`
        : billingAddress.street,
      city: organization?.city || billingAddress.city,
      state: organization?.state || billingAddress.state,
      zip: organization?.postal_code || billingAddress.zip,
    };

    const serviceFacility = {
      name: organization?.name || organization?.billing_name || "",
      npi: organization?.npi || organization?.billing_npi || "",
      place_of_service:
        encounter?.place_of_service ||
        organization?.default_place_of_service ||
        "11",
      phone: organization?.phone || organization?.billing_phone || "",
      street: facilityAddress.street,
      city: facilityAddress.city,
      state: facilityAddress.state,
      zip: facilityAddress.zip,
      address:
        `${facilityAddress.street} ${facilityAddress.city} ${facilityAddress.state} ${facilityAddress.zip}`.trim(),
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
  }
}
