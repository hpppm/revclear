import { query } from "../config/db";
import { decryptPHIJsonFields, encryptPHIJson } from "../utils/crypto";
import logger from "../utils/logger";

type AiResultRow = {
  id: string;
  encounter_id: string;
  flow_name: string;
  input_json: any;
  output_json: any;
  model_version?: string;
  confidence_score?: number;
  created_at: Date | string;
};

const AI_RESULT_PHI_JSON_FIELDS = ["input_json", "output_json"] as const;

const decryptAiResultRow = (row: AiResultRow): AiResultRow =>
  decryptPHIJsonFields(row, AI_RESULT_PHI_JSON_FIELDS) as AiResultRow;

const decryptOptionalAiResultRow = (
  row: AiResultRow | undefined,
): AiResultRow | undefined =>
  decryptPHIJsonFields(row, AI_RESULT_PHI_JSON_FIELDS) as AiResultRow | undefined;

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
    // SECURITY: Explicit column list prevents future sensitive columns (e.g. internal flags)
    // from leaking into callers if the schema evolves.
    `INSERT INTO audio_records (encounter_id, file_url, transcription_status, duration_seconds)
     VALUES ($1, $2, $3, $4)
     RETURNING id, encounter_id, file_url, transcription_status, duration_seconds, created_at`,
    [encounter_id, file_url, transcription_status, duration_seconds ?? null],
  );
  return result.rows[0];
};

export const createAiResult = async (data: {
  encounter_id: string;
  flow_name: string;
  input_json?: any;
  output_json: any;
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
  const result = await query(
    // SECURITY: Explicit column list — data minimization per CLAUDE.md security patterns.
    `INSERT INTO ai_results (encounter_id, flow_name, input_json, output_json, model_version, confidence_score)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, encounter_id, flow_name, input_json, output_json, model_version, confidence_score, created_at`,
    [
      encounter_id,
      flow_name,
      encryptPHIJson(input_json ?? null),
      encryptPHIJson(output_json ?? null),
      model_version ?? null,
      confidence_score ?? null,
    ],
  );
  return decryptAiResultRow(result.rows[0] as AiResultRow);
};

// Explicit column list for ai_results queries
const AI_RESULT_COLUMNS = `id, encounter_id, flow_name, input_json, output_json, model_version, confidence_score, created_at`;

export const getLatestAiResult = async (
  encounter_id: string,
  flow_name: string,
) => {
  logger.debug({ encounter_id, flow_name }, 'getLatestAiResult');
  const result = await query(
    `SELECT ${AI_RESULT_COLUMNS}
     FROM ai_results
     WHERE encounter_id = $1 AND flow_name = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [encounter_id, flow_name],
  );
  return decryptOptionalAiResultRow(result.rows[0] as AiResultRow | undefined);
};

export const getLatestAiResultByFlowNames = async (
  encounter_id: string,
  flow_names: string[],
) => {
  const uniqueFlowNames = [...new Set(flow_names.filter((f) => f && f.trim().length > 0))];
  if (uniqueFlowNames.length === 0) return undefined;

  logger.debug({ encounter_id, flow_names: uniqueFlowNames }, 'getLatestAiResultByFlowNames');
  const result = await query(
    `SELECT ${AI_RESULT_COLUMNS}
     FROM ai_results
     WHERE encounter_id = $1 AND flow_name = ANY($2::text[])
     ORDER BY created_at DESC
     LIMIT 1`,
    [encounter_id, uniqueFlowNames],
  );
  return decryptOptionalAiResultRow(result.rows[0] as AiResultRow | undefined);
};
