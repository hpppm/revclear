import { query } from "../config/db";
import { AppError } from "../utils/AppError";
import {
  decryptPHITextFields,
  encryptPHIText,
} from "../utils/crypto";

interface PaginationOptions {
  limit?: number;
  offset?: number;
}

// Whitelist of allowed fields for patient updates - security measure against SQL injection
const ALLOWED_PATIENT_FIELDS = [
  "full_name",
  "dob",
  "gender",
  "phone",
  "email",
  "address_street",
  "address_city",
  "address_state",
  "address_zip",
  "insurance_provider",
  "insurance_policy_number",
  "insurance_member_id",
  "insurance_group_number",
  "insurance_payer_id",
  "insurance_payer_name",
  "insurance_relationship",
  "subscriber_id",
  "plan_name",
];

// Whitelist of allowed fields for subscriber updates
const ALLOWED_SUBSCRIBER_FIELDS = [
  "full_name",
  "dob",
  "gender",
  "phone",
  "address_street",
  "address_city",
  "address_state",
  "address_zip",
  "member_id",
  "group_number",
  "plan_name",
];

export const PATIENT_ENCRYPTED_FIELDS = [
  "full_name",
  "dob",
  "gender",
  "phone",
  "email",
  "address_street",
  "address_city",
  "address_state",
  "address_zip",
  "insurance_provider",
  "insurance_policy_number",
  "insurance_member_id",
  "insurance_group_number",
  "insurance_payer_name",
  "insurance_relationship",
  "plan_name",
] as const;

export const SUBSCRIBER_ENCRYPTED_FIELDS = [
  "full_name",
  "dob",
  "gender",
  "phone",
  "address_street",
  "address_city",
  "address_state",
  "address_zip",
  "member_id",
  "group_number",
  "plan_name",
] as const;

const PATIENT_ENCRYPTED_FIELD_SET = new Set<string>(PATIENT_ENCRYPTED_FIELDS);
const SUBSCRIBER_ENCRYPTED_FIELD_SET = new Set<string>(SUBSCRIBER_ENCRYPTED_FIELDS);

const maybeEncryptField = (field: string, value: any) =>
  PATIENT_ENCRYPTED_FIELD_SET.has(field) || SUBSCRIBER_ENCRYPTED_FIELD_SET.has(field)
    ? encryptPHIText(value ?? null)
    : value;

export const decryptPatientRow = <T extends Record<string, any> | null | undefined>(patient: T): T =>
  decryptPHITextFields(
    patient,
    PATIENT_ENCRYPTED_FIELD_SET,
  ) as T;

export const decryptSubscriberRow = <T extends Record<string, any> | null | undefined>(
  subscriber: T,
): T =>
  decryptPHITextFields(
    subscriber,
    SUBSCRIBER_ENCRYPTED_FIELD_SET,
  ) as T;

// Explicit column list for subscriber queries - data minimization
const SUBSCRIBER_SELECT_COLUMNS = `
    id, patient_id, full_name, dob, gender, phone,
    address_street, address_city, address_state, address_zip,
    member_id, group_number, plan_name,
    created_at, updated_at
`
  .replace(/\s+/g, " ")
  .trim();

// Explicit column list for patient queries - data minimization security measure
const PATIENT_SELECT_COLUMNS = `
    id, full_name, dob, gender, phone, email,
    address_street, address_city, address_state, address_zip,
    insurance_provider, insurance_policy_number, insurance_member_id,
    insurance_group_number, insurance_payer_id, insurance_payer_name,
    insurance_relationship, subscriber_id, plan_name,
    clinician_id, organization_id, primary_clinician_id,
    created_at
`
  .replace(/\s+/g, " ")
  .trim();

export class PatientService {
  static async findAll(
    organizationId: string,
    clinicianId: string,
    options?: PaginationOptions,
  ) {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const countResult = await query(
      "SELECT COUNT(*) as total FROM patients WHERE (organization_id = $1 OR (organization_id IS NULL AND clinician_id = $2))",
      [organizationId, clinicianId],
    );
    const total = parseInt(countResult.rows[0].total);

    const result = await query(
      `SELECT ${PATIENT_SELECT_COLUMNS} FROM patients WHERE (organization_id = $1 OR (organization_id IS NULL AND clinician_id = $2)) ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
      [organizationId, clinicianId, limit, offset],
    );
    const enriched = await Promise.all(
      result.rows.map(this.enrichPatientWithSubscriber),
    );
    return { data: enriched, total };
  }

  static async findById(
    id: string,
    organizationId: string,
    clinicianId: string,
  ) {
    const result = await query(
      `SELECT ${PATIENT_SELECT_COLUMNS} FROM patients WHERE id = $1 AND (organization_id = $2 OR (organization_id IS NULL AND clinician_id = $3))`,
      [id, organizationId, clinicianId],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return this.enrichPatientWithSubscriber(result.rows[0]);
  }

  static async create(data: any, organizationId: string, clinicianId: string) {
    const columns = [
      "full_name",
      "clinician_id",
      "organization_id",
      "primary_clinician_id",
    ];
    const values: any[] = [
      encryptPHIText(data.full_name),
      clinicianId,
      organizationId,
      clinicianId,
    ];
    const placeholders = ["$1", "$2", "$3", "$4"];
    let idx = 5;

    const optionalFields: Record<string, any> = {
      dob: data.dob,
      gender: data.gender,
      phone: data.phone,
      email: data.email,
      address_street: data.address_street,
      address_city: data.address_city,
      address_state: data.address_state,
      address_zip: data.address_zip,
      insurance_provider: data.insurance_provider,
      insurance_policy_number: data.insurance_policy_number,
      insurance_member_id: data.insurance_member_id,
      insurance_group_number: data.insurance_group_number,
      insurance_payer_id: data.insurance_payer_id,
      insurance_payer_name: data.insurance_payer_name,
      insurance_relationship: data.insurance_relationship,
      subscriber_id: data.subscriber_id,
      plan_name: data.plan_name,
    };

    for (const [key, value] of Object.entries(optionalFields)) {
      if (value !== undefined) {
        columns.push(key);
        placeholders.push(`$${idx}`);
        values.push(maybeEncryptField(key, value));
        idx += 1;
      }
    }

    const insertQuery = `INSERT INTO patients (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING ${PATIENT_SELECT_COLUMNS}`;
    const result = await query(insertQuery, values);

    return this.enrichPatientWithSubscriber(result.rows[0]);
  }

  static async update(
    id: string,
    data: any,
    organizationId: string,
    clinicianId: string,
  ) {
    const ownershipCheck = await query(
      "SELECT id FROM patients WHERE id = $1 AND (organization_id = $2 OR (organization_id IS NULL AND clinician_id = $3))",
      [id, organizationId, clinicianId],
    );
    if (ownershipCheck.rows.length === 0) {
      throw new AppError("Patient not found", 404);
    }

    // Filter to only allowed fields to prevent SQL injection via field names
    const safeEntries = Object.entries(data).filter(([key]) =>
      ALLOWED_PATIENT_FIELDS.includes(key),
    );

    if (safeEntries.length === 0) {
      throw new AppError("No valid fields to update", 400);
    }

    const fields = safeEntries.map(([key], index) => `${key} = $${index + 1}`);
    const values = safeEntries.map(([key, value]) => maybeEncryptField(key, value));

    const queryText = `UPDATE patients SET ${fields.join(", ")} WHERE id = $${fields.length + 1} RETURNING ${PATIENT_SELECT_COLUMNS}`;
    const result = await query(queryText, [...values, id]);

    if (result.rows.length === 0) {
      throw new AppError("Patient not found", 404);
    }
    return this.enrichPatientWithSubscriber(result.rows[0]);
  }

  static async delete(id: string, organizationId: string, clinicianId: string) {
    const result = await query(
      "DELETE FROM patients WHERE id = $1 AND (organization_id = $2 OR (organization_id IS NULL AND clinician_id = $3)) RETURNING id",
      [id, organizationId, clinicianId],
    );

    if (result.rows.length === 0) {
      throw new AppError("Patient not found", 404);
    }
    return true;
  }

  static async upsertSubscriber(
    patientId: string,
    data: any,
    organizationId: string,
    clinicianId: string,
  ) {
    const patientResult = await query(
      "SELECT id, subscriber_id FROM patients WHERE id = $1 AND (organization_id = $2 OR (organization_id IS NULL AND clinician_id = $3))",
      [patientId, organizationId, clinicianId],
    );
    if (patientResult.rows.length === 0) {
      throw new AppError("Patient not found", 404);
    }
    const currentSubscriberId = patientResult.rows[0].subscriber_id;

    let subscriber;
    const relationship = data.relationship || "other";
    if (currentSubscriberId) {
      // Update existing - filter to allowed fields only
      const safeEntries = Object.entries(data).filter(([key]) =>
        ALLOWED_SUBSCRIBER_FIELDS.includes(key),
      );
      const fields = safeEntries.map(
        ([key], index) => `${key} = $${index + 1}`,
      );
      const values = safeEntries.map(([key, value]) => maybeEncryptField(key, value));
      const updated = await query(
        `UPDATE insurance_subscribers SET ${fields.join(", ")} WHERE id = $${fields.length + 1} RETURNING ${SUBSCRIBER_SELECT_COLUMNS}`,
        [...values, currentSubscriberId],
      );
      subscriber = updated.rows[0];
      await query(
        "UPDATE patients SET insurance_relationship = $1 WHERE id = $2",
        [relationship, patientId],
      );
    } else {
      // Create new - filter to allowed fields only
      const columns = ["patient_id"];
      const values: any[] = [patientId];
      const placeholders = ["$1"];
      let idx = 2;
      Object.entries(data)
        .filter(([key]) => ALLOWED_SUBSCRIBER_FIELDS.includes(key))
        .forEach(([key, value]) => {
          columns.push(key);
          placeholders.push(`$${idx}`);
          values.push(maybeEncryptField(key, value));
          idx += 1;
        });
      const inserted = await query(
        `INSERT INTO insurance_subscribers (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING ${SUBSCRIBER_SELECT_COLUMNS}`,
        values,
      );
      subscriber = inserted.rows[0];
      await query(
        "UPDATE patients SET subscriber_id = $1, insurance_relationship = $2 WHERE id = $3",
        [subscriber.id, relationship, patientId],
      );
    }

    return decryptSubscriberRow(subscriber);
  }

  static async getSubscriber(
    patientId: string,
    organizationId: string,
    clinicianId: string,
  ) {
    const patientResult = await query(
      "SELECT subscriber_id FROM patients WHERE id = $1 AND (organization_id = $2 OR (organization_id IS NULL AND clinician_id = $3))",
      [patientId, organizationId, clinicianId],
    );
    if (patientResult.rows.length === 0) {
      throw new AppError("Patient not found", 404);
    }

    const subscriberId = patientResult.rows[0].subscriber_id;
    if (!subscriberId) {
      return null;
    }

    const subscriberResult = await query(
      `SELECT ${SUBSCRIBER_SELECT_COLUMNS} FROM insurance_subscribers WHERE id = $1`,
      [subscriberId],
    );

    return decryptSubscriberRow(subscriberResult.rows[0] || null);
  }

  private static async enrichPatientWithSubscriber(patient: any) {
    const decryptedPatient = decryptPatientRow(patient);
    if (patient?.subscriber_id) {
      const subRes = await query(
        `SELECT ${SUBSCRIBER_SELECT_COLUMNS} FROM insurance_subscribers WHERE id = $1`,
        [patient.subscriber_id],
      );
      const subscriber = decryptSubscriberRow(subRes.rows[0] || null);
      return { ...decryptedPatient, subscriber };
    }
    return decryptedPatient;
  }
}
