import { query } from "../config/db";
import { encryptPHI, decryptPHI } from "../utils/crypto";
import logger from "../utils/logger";

export type AiResultRow = {
  id: string;
  encounter_id: string;
  flow_name: string;
  input_json: unknown;
  output_json: unknown;
  model_version: string | null;
  confidence_score: number | null;
  created_at: Date;
};

export const createAudioRecord = async (data: {
  encounter_id: string;
  file_url: string;
  transcription_status?: string;
  duration_seconds?: number;
}) => {
  const {
    encounter_id,
    file_url,
    transcription_status = "uploaded",
    duration_seconds,
  } = data;
  const result = await query(
    `INSERT INTO audio_records (encounter_id, file_url, transcription_status, duration_seconds)
     VALUES ($1, $2, $3, $4)
     RETURNING id, encounter_id, file_url, transcription_status, duration_seconds, created_at`,
    [encounter_id, file_url, transcription_status, duration_seconds ?? null],
  );
  return result.rows[0];
};

// Encrypt PHI output_json before persisting.
// Stored as { "encrypted": "<ciphertext>" } so Postgres accepts it as valid JSONB.
const encryptOutputJson = (output_json: unknown): unknown => {
  const plaintext = JSON.stringify(output_json);
  const ciphertext = encryptPHI(plaintext);
  return { encrypted: ciphertext };
};

// Decrypt output_json after reading. Handles both encrypted and legacy plaintext rows.
export const decryptOutputJson = (stored: unknown): unknown => {
  if (
    stored &&
    typeof stored === "object" &&
    "encrypted" in (stored as Record<string, unknown>)
  ) {
    try {
      const plaintext = decryptPHI(
        (stored as Record<string, string>).encrypted,
      );
      return JSON.parse(plaintext);
    } catch {
      logger.error(
        "decryptOutputJson: failed to decrypt ai_results output_json",
      );
      throw new Error("Failed to decrypt AI result data.");
    }
  }
  // Legacy unencrypted row — return as-is (read-only path; new writes always encrypt)
  return stored;
};

export const createAiResult = async (data: {
  encounter_id: string;
  flow_name: string;
  input_json?: unknown;
  output_json: unknown;
  model_version?: string;
  confidence_score?: number;
}) => {
  const {
    encounter_id,
    flow_name,
    input_json,
    output_json,
    model_version,
    confidence_score,
  } = data;

  const encryptedOutput = encryptOutputJson(output_json);

  const result = await query(
    `INSERT INTO ai_results (encounter_id, flow_name, input_json, output_json, model_version, confidence_score)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, encounter_id, flow_name, input_json, output_json, model_version, confidence_score, created_at`,
    [
      encounter_id,
      flow_name,
      input_json ?? null,
      encryptedOutput,
      model_version ?? null,
      confidence_score ?? null,
    ],
  );

  const row = result.rows[0] as AiResultRow;
  return {
    ...row,
    output_json: decryptOutputJson(row.output_json),
  } as AiResultRow;
};

// Explicit column list for ai_results queries
const AI_RESULT_COLUMNS = `id, encounter_id, flow_name, input_json, output_json, model_version, confidence_score, created_at`;

export const getLatestAiResult = async (
  encounter_id: string,
  flow_name: string,
) => {
  logger.debug({ encounter_id, flow_name }, "getLatestAiResult");
  const result = await query(
    `SELECT ${AI_RESULT_COLUMNS}
     FROM ai_results
     WHERE encounter_id = $1 AND flow_name = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [encounter_id, flow_name],
  );
  if (!result.rows[0]) return undefined;
  const row = result.rows[0] as AiResultRow;
  return {
    ...row,
    output_json: decryptOutputJson(row.output_json),
  } as AiResultRow;
};

export const getLatestAiResultByFlowNames = async (
  encounter_id: string,
  flow_names: string[],
) => {
  const uniqueFlowNames = [
    ...new Set(flow_names.filter((f) => f && f.trim().length > 0)),
  ];
  if (uniqueFlowNames.length === 0) return undefined;

  logger.debug(
    { encounter_id, flow_names: uniqueFlowNames },
    "getLatestAiResultByFlowNames",
  );
  const result = await query(
    `SELECT ${AI_RESULT_COLUMNS}
     FROM ai_results
     WHERE encounter_id = $1 AND flow_name = ANY($2::text[])
     ORDER BY created_at DESC
     LIMIT 1`,
    [encounter_id, uniqueFlowNames],
  );
  if (!result.rows[0]) return undefined;
  const row = result.rows[0] as AiResultRow;
  return {
    ...row,
    output_json: decryptOutputJson(row.output_json),
  } as AiResultRow;
};
