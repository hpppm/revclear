import { query } from "../config/db";
import { AppError } from "../utils/AppError";
import {
  decryptPHIJsonFields,
  encryptPHIJson,
} from "../utils/crypto";
import { decryptPatientRow, decryptSubscriberRow } from "./patientService";
import { submitClaimToClearinghouse } from "./clearinghouseService";
import { buildEdi837String, validateClaimCodes } from "./ediService";
import { getOrgEdiSettings } from "../utils/organization";

interface PaginationOptions {
  limit?: number;
  offset?: number;
}

// Used in INSERT ... RETURNING (no JOIN available)
const CLAIM_BARE_COLUMNS = `
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

// Used in SELECT ... JOIN encounters — COALESCE fills service dates from encounter for older claims
const CLAIM_SELECT_COLUMNS = `
    c.id, c.encounter_id, c.patient_id, c.clinician_id, c.organization_id,
    c.diagnosis_codes, c.procedure_codes, c.total_amount, c.insurance_provider,
    c.status, c.rejection_reason, c.submission_date, c.payment_date,
    c.payer_id, c.payer_name, c.claim_type, c.submission_type, c.patient_responsibility,
    c.line_items, c.billing_provider, c.service_facility, c.rendering_provider,
    c.subscriber, c.subscriber_relationship,
    COALESCE(c.service_date_start::text, e.date_of_service::date::text) AS service_date_start,
    COALESCE(c.service_date_end::text, e.date_of_service::date::text) AS service_date_end,
    c.created_at, c.updated_at
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

// Fix #3: static column set — avoids information_schema query on every write
const CLAIM_WRITABLE_COLUMNS = new Set([
  "encounter_id", "clinician_id", "patient_id", "organization_id",
  "diagnosis_codes", "procedure_codes", "total_amount", "insurance_provider",
  "status", "rejection_reason", "submission_date", "payment_date",
  "payer_id", "payer_name", "claim_type", "submission_type", "patient_responsibility",
  "line_items", "billing_provider", "service_facility", "rendering_provider",
  "subscriber", "subscriber_relationship", "service_date_start", "service_date_end",
]);

export class ClaimService {
  static async findAll(
    organizationId: string,
    _clinicianId: string,
    options?: PaginationOptions,
  ) {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const countResult = await query(
      "SELECT COUNT(*) as total FROM claims WHERE organization_id = $1",
      [organizationId],
    );
    const total = parseInt(countResult.rows[0].total);

    const result = await query(
      `SELECT ${CLAIM_SELECT_COLUMNS} FROM claims c LEFT JOIN encounters e ON e.id = c.encounter_id WHERE c.organization_id = $1 ORDER BY c.created_at DESC LIMIT $2 OFFSET $3`,
      [organizationId, limit, offset],
    );
    return { data: result.rows.map((row) => decryptClaimRow(row)), total };
  }

  static async findById(
    id: string,
    organizationId: string,
    _clinicianId: string,
  ) {
    const result = await query(
      `SELECT ${CLAIM_SELECT_COLUMNS} FROM claims c LEFT JOIN encounters e ON e.id = c.encounter_id WHERE c.id = $1 AND c.organization_id = $2`,
      [id, organizationId],
    );
    return decryptClaimRow(result.rows[0] || null);
  }

  static async create(data: any, organizationId: string, clinicianId: string) {
    // Check if encounter_id exists and belongs to org
    const encounterCheck = await query(
      "SELECT id, patient_id FROM encounters WHERE id = $1 AND organization_id = $2",
      [data.encounter_id, organizationId],
    );
    if (encounterCheck.rows.length === 0) {
      throw new AppError("Encounter not found", 404);
    }
    const encounterPatientId = encounterCheck.rows[0].patient_id;

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
      if (value !== undefined && CLAIM_WRITABLE_COLUMNS.has(key)) {
        columns.push(key);
        placeholders.push(`$${idx}`);
        values.push(serializeClaimValue(key, value));
        idx += 1;
      }
    }

    const insertQuery = `INSERT INTO claims (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING ${CLAIM_BARE_COLUMNS}`;
    const result = await query(insertQuery, values);
    return decryptClaimRow(result.rows[0]);
  }

  static async update(
    id: string,
    data: any,
    organizationId: string,
    _clinicianId: string,
  ) {
    const claimOwner = await query(
      "SELECT id FROM claims WHERE id = $1 AND organization_id = $2",
      [id, organizationId],
    );
    if (claimOwner.rows.length === 0) {
      throw new AppError("Claim not found", 404);
    }

    const entries = Object.entries(data).filter(
      ([key, value]) => value !== undefined && CLAIM_WRITABLE_COLUMNS.has(key),
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
      `UPDATE claims SET ${fields} WHERE id = $${values.length + 1} AND organization_id = $${values.length + 2} RETURNING ${CLAIM_BARE_COLUMNS}`,
      [...values, id, organizationId],
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

    // Fetch org-specific EDI/clearinghouse settings
    const orgEdi = await getOrgEdiSettings(organizationId);

    // Send to clearinghouse using org settings
    const response = await submitClaimToClearinghouse(claim, orgEdi);

    // Map clearinghouse response to our status
    const newStatus =
      response.status === "accepted"
        ? "submitted"
        : response.status === "denied"
        ? "denied"
        : "pending";

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

    const orgEdi = await getOrgEdiSettings(organizationId);
    const ediString = buildEdi837String(claim, orgEdi);
    return { ediString, claimId: id };
  }

  static async delete(id: string, organizationId: string, _clinicianId: string) {
    const result = await query(
      "DELETE FROM claims WHERE id = $1 AND organization_id = $2 RETURNING id",
      [id, organizationId],
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
      // Always refresh live fields from current org/clinician data — these may be
      // stale in claims created before the org billing profile was fully saved.
      const patientForHydration = existing.patient_id ? await query(
        `SELECT full_name, insurance_member_id, insurance_group_number, insurance_policy_number FROM patients WHERE id = $1 AND organization_id = $2`,
        [existing.patient_id, organization.id]
      ).then(r => r.rows[0] ? decryptPatientRow(r.rows[0]) : null).catch(() => null) : null;

      // Refresh billing_provider from current org (fill any missing/empty fields)
      const billingProvider = { ...(existing.billing_provider || {}) };
      if (!billingProvider.name) billingProvider.name = organization?.billing_name || organization?.name || "";
      if (!billingProvider.npi) billingProvider.npi = organization?.billing_npi || organization?.npi || "";
      if (!billingProvider.tax_id) billingProvider.tax_id = organization?.billing_tax_id || organization?.tax_id || "";
      if (!billingProvider.phone) billingProvider.phone = organization?.billing_phone || organization?.phone || "";
      if (!billingProvider.street && organization?.billing_address_line1) {
        const line2 = organization.billing_address_line2 ? `, ${organization.billing_address_line2}` : "";
        billingProvider.street = `${organization.billing_address_line1}${line2}`;
      }
      if (!billingProvider.city) billingProvider.city = organization?.billing_city || "";
      if (!billingProvider.state) billingProvider.state = organization?.billing_state || "";
      if (!billingProvider.zip) billingProvider.zip = organization?.billing_postal_code || "";
      if (!billingProvider.address || !billingProvider.address.street) {
        billingProvider.address = {
          street: billingProvider.street || "",
          city: billingProvider.city || "",
          state: billingProvider.state || "",
          zip: billingProvider.zip || "",
        };
      }

      // Refresh service_facility from current org
      const serviceFacility = { ...(existing.service_facility || {}) };
      if (!serviceFacility.name) serviceFacility.name = organization?.name || organization?.billing_name || "";
      if (!serviceFacility.npi) serviceFacility.npi = organization?.npi || organization?.billing_npi || "";
      if (!serviceFacility.place_of_service) serviceFacility.place_of_service = organization?.default_place_of_service || "11";
      if (!serviceFacility.phone) serviceFacility.phone = organization?.phone || organization?.billing_phone || "";
      if (!serviceFacility.street) {
        const src = organization?.address_line1 || organization?.billing_address_line1;
        if (src) {
          const line2 = (organization?.address_line2 || organization?.billing_address_line2)
            ? `, ${organization.address_line2 || organization.billing_address_line2}`
            : "";
          serviceFacility.street = `${src}${line2}`;
        }
      }
      if (!serviceFacility.city) serviceFacility.city = organization?.city || organization?.billing_city || "";
      if (!serviceFacility.state) serviceFacility.state = organization?.state || organization?.billing_state || "";
      if (!serviceFacility.zip) serviceFacility.zip = organization?.postal_code || organization?.billing_postal_code || "";
      if (!serviceFacility.address || !serviceFacility.address.street) {
        serviceFacility.address = {
          street: serviceFacility.street || "",
          city: serviceFacility.city || "",
          state: serviceFacility.state || "",
          zip: serviceFacility.zip || "",
        };
      }

      return {
        ...existing,
        billing_provider: billingProvider,
        service_facility: serviceFacility,
        rendering_provider: {
          ...(existing.rendering_provider || {}),
          name: user.full_name || existing.rendering_provider?.name || "",
          npi: user.npi || existing.rendering_provider?.npi || "",
          taxonomy_code: user.taxonomy_code || existing.rendering_provider?.taxonomy_code || "",
        },
        patient_name: existing.patient_name || patientForHydration?.full_name || null,
        insurance_policy_number: existing.insurance_policy_number || patientForHydration?.insurance_policy_number || null,
        subscriber: {
          ...(existing.subscriber || {}),
          member_id: existing.subscriber?.member_id || patientForHydration?.insurance_member_id || null,
          group_number: existing.subscriber?.group_number || patientForHydration?.insurance_group_number || null,
        },
      };
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
             FROM patients WHERE id = $1 AND organization_id = $2`,
      [encounter.patient_id, organization.id],
    );
    if (patientResult.rows.length === 0) {
      throw new AppError("Patient not found", 404);
    }
    const patient = decryptPatientRow(patientResult.rows[0]);

    // Get medical codes
    const codes = await this.getMedicalCodesByEncounter(encounterId, organization.id);
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
    _clinician_id?: string,
    organization_id?: string,
  ) {
    const params: any[] = [encounter_id];
    let sql = `SELECT ${CLAIM_SELECT_COLUMNS} FROM claims c LEFT JOIN encounters e ON e.id = c.encounter_id WHERE c.encounter_id = $1`;
    if (organization_id) {
      sql += " AND c.organization_id = $2";
      params.push(organization_id);
    }
    sql += " ORDER BY c.created_at DESC LIMIT 1";
    const result = await query(sql, params);
    return decryptClaimRow(result.rows[0] || null);
  }

  private static async requireOwnedEncounter(
    encounterId: string,
    _clinicianId: string,
    organizationId?: string,
  ) {
    const result = await query(
      `SELECT id, patient_id, clinician_id, organization_id, date_of_service, status, place_of_service
             FROM encounters WHERE id = $1 AND organization_id = $2`,
      [encounterId, organizationId || null],
    );
    return result.rows[0] || null;
  }

  private static async getMedicalCodesByEncounter(encounter_id: string, organization_id: string) {
    const result = await query(
      `SELECT mc.id, mc.encounter_id, mc.code, mc.code_type, mc.description, mc.category, mc.confidence_score, mc.is_ai_suggested, mc.created_at
       FROM medical_codes mc
       JOIN encounters e ON e.id = mc.encounter_id
       WHERE mc.encounter_id = $1 AND e.organization_id = $2
       ORDER BY mc.created_at ASC`,
      [encounter_id, organization_id],
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

    // Look up charge from org fee schedule; fall back to 150.00 when no
    // fee schedule entry exists so the claim is never generated with $0 charges.
    const feeSchedule: Record<string, number> =
      organization?.fee_schedule && typeof organization.fee_schedule === "object"
        ? (organization.fee_schedule as Record<string, number>)
        : {};

    const DEFAULT_CHARGE = 150.0;

    // Each CPT code should reference ALL applicable ICD codes (by position, 1-indexed)
    const icdPointers = Array.from({ length: icdCodes.length }, (_, i) => i + 1);

    const lineItems = cptCodes.map((c, index) => ({
      line_number: index + 1,
      procedure_code: c.code,
      modifiers: [],
      diagnosis_pointers: icdPointers,
      units: 1,
      charge_amount: typeof feeSchedule[c.code] === "number" ? feeSchedule[c.code] : DEFAULT_CHARGE,
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
      patient_name: patient.full_name || null,
      diagnosis_codes: icdCodes,
      procedure_codes: cptCodes.map((c) => c.code),
      total_amount: totalAmount,
      insurance_provider: patient.insurance_provider || null,
      insurance_policy_number: patient.insurance_policy_number || null,
      status: "draft",
      payer_id: patient.insurance_payer_id || null,
      payer_name: patient.insurance_payer_name || patient.insurance_provider || null,
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
      subscriber: subscriber || {
        member_id: patient.insurance_member_id || null,
        group_number: patient.insurance_group_number || null,
      },
    };
  }
}
