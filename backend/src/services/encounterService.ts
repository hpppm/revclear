import { query } from "../config/db";
import { AppError } from "../utils/AppError";
import {
  decryptPHIText,
  decryptPHITextFields,
  encryptPHIText,
} from "../utils/crypto";

interface PaginationOptions {
  limit?: number;
  offset?: number;
  patientId?: string;
}

// Explicit column list for encounter queries - data minimization security measure
const ENCOUNTER_SELECT_COLUMNS = `
    id, patient_id, clinician_id, organization_id, date_of_service,
    transcript_result_id, soap_result_id, status, place_of_service,
    encounter_type, chief_complaint, created_at, updated_at
`
  .replace(/\s+/g, " ")
  .trim();

const ENCOUNTER_ENCRYPTED_TEXT_FIELDS = ["chief_complaint"] as const;

export class EncounterService {
  private static async getEncounterColumns() {
    const result = await query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'encounters'`,
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
    const patientId = options?.patientId;

    // Build WHERE clause with optional patient_id filter (aliased to e.*)
    const params: any[] = [organizationId, clinicianId];
    let whereClause = "(e.organization_id = $1 OR (e.organization_id IS NULL AND e.clinician_id = $2))";

    if (patientId) {
      params.push(patientId);
      whereClause += ` AND e.patient_id = $${params.length}`;
    }

    const countResult = await query(
      `SELECT COUNT(*) as total FROM encounters e WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].total) || 0;

    const queryParams = [...params, limit, offset];
    const result = await query(
      `SELECT e.id, e.patient_id, e.clinician_id, e.organization_id,
              e.date_of_service, e.transcript_result_id, e.soap_result_id,
              e.status, e.encounter_type, e.place_of_service,
              e.created_at, e.updated_at,
              p.full_name AS patient_name
       FROM encounters e
       LEFT JOIN patients p ON e.patient_id = p.id
       WHERE ${whereClause}
       ORDER BY e.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      queryParams,
    );
    const rows = result.rows.map((row: any) => ({
      ...row,
      patient_name: decryptPHIText(row.patient_name),
    }));
    return { data: rows, total };
  }

  static async findById(
    id: string,
    organizationId: string,
    clinicianId: string,
  ) {
    const result = await query(
      `SELECT e.id,
              e.patient_id,
              e.clinician_id,
              e.organization_id,
              e.date_of_service,
              e.transcript_result_id,
              e.soap_result_id,
              e.status,
              e.place_of_service,
              e.encounter_type,
              e.chief_complaint,
              e.created_at,
              e.updated_at,
              ar.file_url as audio_key
       FROM encounters e
       LEFT JOIN audio_records ar ON e.id = ar.encounter_id
       WHERE e.id = $1 AND (e.organization_id = $2 OR (e.organization_id IS NULL AND e.clinician_id = $3))
       ORDER BY ar.created_at DESC
       LIMIT 1`,
      [id, organizationId, clinicianId],
    );
    return this.decryptEncounterRow(result.rows[0] || null);
  }

  static async create(data: any, organizationId: string, clinicianId: string) {
    // Check if patient_id exists AND belongs to the organization
    const patientCheck = await query(
      "SELECT id FROM patients WHERE id = $1 AND (organization_id = $2 OR (organization_id IS NULL AND clinician_id = $3))",
      [data.patient_id, organizationId, clinicianId],
    );
    if (patientCheck.rows.length === 0) {
      throw new AppError("Patient not found", 404);
    }

    const availableColumns = await this.getEncounterColumns();
    const columns = [
      "patient_id",
      "date_of_service",
      "clinician_id",
      "organization_id",
    ];
    const values: any[] = [
      data.patient_id,
      data.date_of_service,
      clinicianId,
      organizationId,
    ];
    const placeholders = ["$1", "$2", "$3", "$4"];
    let idx = 5;

    const optionalFields: Record<string, any> = {
      transcript_result_id: data.transcript_result_id,
      soap_result_id: data.soap_result_id,
      status: data.status,
      encounter_type: data.encounter_type,
      chief_complaint: data.chief_complaint,
    };

    for (const [key, value] of Object.entries(optionalFields)) {
      if (value !== undefined && availableColumns.includes(key)) {
        columns.push(key);
        placeholders.push(`$${idx}`);
        values.push(
          key === "chief_complaint" ? encryptPHIText(value ?? null) : value,
        );
        idx += 1;
      }
    }

    const insertQuery = `INSERT INTO encounters (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING ${ENCOUNTER_SELECT_COLUMNS}`;
    const result = await query(insertQuery, values);
    return this.decryptEncounterRow(result.rows[0]);
  }

  static async update(
    id: string,
    data: any,
    organizationId: string,
    clinicianId: string,
  ) {
    // If patient_id is being updated, validate it first
    if (data.patient_id) {
      const patientCheck = await query(
        "SELECT id FROM patients WHERE id = $1 AND (organization_id = $2 OR (organization_id IS NULL AND clinician_id = $3))",
        [data.patient_id, organizationId, clinicianId],
      );
      if (patientCheck.rows.length === 0) {
        throw new AppError("Patient not found", 404);
      }
    }

    // Verify encounter ownership before updating
    const encounterOwner = await query(
      "SELECT id FROM encounters WHERE id = $1 AND (organization_id = $2 OR (organization_id IS NULL AND clinician_id = $3))",
      [id, organizationId, clinicianId],
    );
    if (encounterOwner.rows.length === 0) {
      throw new AppError("Encounter not found", 404);
    }

    const availableColumns = await this.getEncounterColumns();
    const entries = Object.entries(data).filter(
      ([key, value]) =>
        value !== undefined &&
        key !== "clinician_id" &&
        availableColumns.includes(key),
    );

    if (entries.length === 0) {
      throw new AppError("No fields to update", 400);
    }

    const fields = entries
      .map(([fieldName], i) => `${fieldName} = $${i + 1}`)
      .join(", ");
    const values = entries.map(([fieldName, value]) =>
      fieldName === "chief_complaint"
        ? encryptPHIText((value as string | null | undefined) ?? null)
        : value,
    );

    const result = await query(
      `UPDATE encounters SET ${fields} WHERE id = $${values.length + 1} RETURNING ${ENCOUNTER_SELECT_COLUMNS}`,
      [...values, id],
    );

    if (result.rows.length === 0) {
      throw new AppError("Encounter not found", 404);
    }

    return this.decryptEncounterRow(result.rows[0]);
  }

  static async delete(id: string, organizationId: string, clinicianId: string) {
    const result = await query(
      "DELETE FROM encounters WHERE id = $1 AND (organization_id = $2 OR (organization_id IS NULL AND clinician_id = $3)) RETURNING id",
      [id, organizationId, clinicianId],
    );

    if (result.rowCount === 0) {
      throw new AppError("Encounter not found", 404);
    }
    return true;
  }

  private static decryptEncounterRow<T extends Record<string, any> | null>(
    encounter: T,
  ): T {
    return decryptPHITextFields(
      encounter,
      ENCOUNTER_ENCRYPTED_TEXT_FIELDS,
    ) as T;
  }
}
