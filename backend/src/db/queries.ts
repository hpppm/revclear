import { query } from "../config/db";

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
     RETURNING *`,
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
    `INSERT INTO ai_results (encounter_id, flow_name, input_json, output_json, model_version, confidence_score)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      encounter_id,
      flow_name,
      input_json ?? null,
      output_json ?? null,
      model_version ?? null,
      confidence_score ?? null,
    ],
  );
  return result.rows[0];
};

// Explicit column list for ai_results queries
const AI_RESULT_COLUMNS = `id, encounter_id, flow_name, input_json, output_json, model_version, confidence_score, created_at`;

export const getLatestAiResult = async (
  encounter_id: string,
  flow_name: string,
) => {
  console.log(
    `[getLatestAiResult] Querying for encounter_id=${encounter_id}, flow_name=${flow_name}`,
  );
  const result = await query(
    `SELECT ${AI_RESULT_COLUMNS}
     FROM ai_results
     WHERE encounter_id = $1 AND flow_name = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [encounter_id, flow_name],
  );
  console.log(`[getLatestAiResult] Found ${result.rows.length} rows`);
  return result.rows[0];
};
