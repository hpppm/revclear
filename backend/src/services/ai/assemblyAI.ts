import fetch from "node-fetch";
import logger from "../../utils/logger";

const ASSEMBLYAI_BASE_URL = "https://api.assemblyai.com/v2";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 180_000; // 3 minutes

export type AssemblyAISpeechModel = "universal" | "best" | "nano";

export interface CreateTranscriptOptions {
  audioUrl: string;
  speechModel?: AssemblyAISpeechModel;
  medicalMode?: boolean;
  languageCode?: string;
}

export interface TranscriptResult {
  text: string;
  confidence: number | null;
  audioDurationSeconds: number | null;
  languageCode: string | null;
  modelVersion: string;
}

interface AssemblyAITranscript {
  id: string;
  status: "queued" | "processing" | "completed" | "error";
  text: string | null;
  confidence: number | null;
  audio_duration: number | null;
  language_code: string | null;
  error: string | null;
}

function getApiKey(): string {
  const key = process.env.ASSEMBLY_TRANSCRIPTION_API_KEY;
  if (!key) {
    throw new Error(
      "ASSEMBLY_TRANSCRIPTION_API_KEY is not configured",
    );
  }
  return key;
}

export async function createTranscript(
  opts: CreateTranscriptOptions,
): Promise<string> {
  const apiKey = getApiKey();
  const speechModel = opts.speechModel ?? "universal";
  const medicalMode = opts.medicalMode ?? false;

  const body = {
    audio_url: opts.audioUrl,
    speech_models: [speechModel],
    language_code: opts.languageCode ?? "en_us",
    punctuate: true,
    format_text: true,
    ...(medicalMode ? { medical: true } : {}),
  };

  const response = await fetch(`${ASSEMBLYAI_BASE_URL}/transcript`, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(
      { status: response.status, error: errorText },
      "assemblyai: createTranscript failed",
    );
    throw new Error(`AssemblyAI transcript creation failed (${response.status})`);
  }

  const data = (await response.json()) as AssemblyAITranscript;
  logger.info({ transcriptId: data.id, status: data.status }, "assemblyai: transcript created");
  return data.id;
}

export async function pollTranscript(
  transcriptId: string,
): Promise<TranscriptResult> {
  const apiKey = getApiKey();
  const start = Date.now();

  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const response = await fetch(
      `${ASSEMBLYAI_BASE_URL}/transcript/${transcriptId}`,
      {
        method: "GET",
        headers: { Authorization: apiKey },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        { status: response.status, error: errorText, transcriptId },
        "assemblyai: pollTranscript failed",
      );
      throw new Error(`AssemblyAI poll failed (${response.status})`);
    }

    const data = (await response.json()) as AssemblyAITranscript;

    if (data.status === "completed") {
      logger.info(
        {
          transcriptId,
          duration: data.audio_duration,
          confidence: data.confidence,
          chars: data.text?.length ?? 0,
        },
        "assemblyai: transcript completed",
      );
      return {
        text: data.text ?? "",
        confidence: data.confidence,
        audioDurationSeconds: data.audio_duration,
        languageCode: data.language_code,
        modelVersion: "assemblyai-universal",
      };
    }

    if (data.status === "error") {
      logger.error(
        { transcriptId, error: data.error },
        "assemblyai: transcript errored",
      );
      throw new Error("AssemblyAI transcription failed");
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  logger.error({ transcriptId }, "assemblyai: poll timeout");
  throw new Error("AssemblyAI transcription timed out");
}

export async function transcribeFromUrl(
  audioUrl: string,
  opts: Omit<CreateTranscriptOptions, "audioUrl"> = {},
): Promise<TranscriptResult> {
  const transcriptId = await createTranscript({ audioUrl, ...opts });
  const result = await pollTranscript(transcriptId);
  if (opts.medicalMode) {
    return { ...result, modelVersion: `${result.modelVersion}-medical` };
  }
  return result;
}
