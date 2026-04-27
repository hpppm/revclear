import fetch from "node-fetch";
import { z } from "zod";
import logger from "../../utils/logger";
import { appConfig } from "../../config/appConfig";

const ASSEMBLYAI_BASE_URL = "https://api.assemblyai.com/v2";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 180_000; // 3 minutes

// Zod schema for AssemblyAI transcript response — validates before field access.
const AssemblyAITranscriptSchema = z.object({
  id: z.string(),
  status: z.enum(["queued", "processing", "completed", "error"]),
  text: z.string().nullable().optional(),
  confidence: z.number().nullable().optional(),
  audio_duration: z.number().nullable().optional(),
  language_code: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
});

type AssemblyAITranscript = z.infer<typeof AssemblyAITranscriptSchema>;

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

// Allowed egress hostnames for PHI audio — must match appConfig allowlist.
const ALLOWED_TRANSCRIPTION_HOST = "api.assemblyai.com";

function getApiKey(): string {
  const key = process.env.ASSEMBLY_TRANSCRIPTION_API_KEY;
  if (!key) {
    throw new Error("ASSEMBLY_TRANSCRIPTION_API_KEY is not configured");
  }
  return key;
}

function assertBaaConfirmed(): void {
  if (!appConfig.ai.assemblyAiBaaConfirmed) {
    throw new Error(
      "PHI audio cannot be sent to AssemblyAI: ASSEMBLYAI_BAA_CONFIRMED is not set to 'true'. " +
      "A signed HIPAA Business Associate Agreement with AssemblyAI must be in place first.",
    );
  }
}

function assertAllowedHost(url: string): void {
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    throw new Error("assemblyai: invalid audio URL — cannot verify host");
  }
  if (hostname !== ALLOWED_TRANSCRIPTION_HOST &&
      !appConfig.ai.approvedTranscriptionHosts.includes(hostname)) {
    throw new Error(
      `assemblyai: PHI audio egress to '${hostname}' is not permitted. ` +
      `Approved hosts: ${appConfig.ai.approvedTranscriptionHosts.join(", ")}`,
    );
  }
}

function parseTranscriptResponse(raw: unknown): AssemblyAITranscript {
  const result = AssemblyAITranscriptSchema.safeParse(raw);
  if (!result.success) {
    logger.error(
      { issues: result.error.issues.map((i) => i.message) },
      "assemblyai: unexpected response shape",
    );
    throw new Error("assemblyai: unexpected response shape from API");
  }
  return result.data;
}

export async function deleteTranscript(transcriptId: string): Promise<void> {
  const apiKey = getApiKey();
  try {
    const response = await fetch(`${ASSEMBLYAI_BASE_URL}/transcript/${transcriptId}`, {
      method: "DELETE",
      headers: { Authorization: apiKey },
    });
    if (!response.ok) {
      logger.warn(
        { transcriptId, status: response.status },
        "assemblyai: transcript deletion failed — PHI may remain on AssemblyAI servers",
      );
    } else {
      logger.info({ transcriptId }, "assemblyai: transcript deleted from remote");
    }
  } catch (err) {
    logger.warn(
      { transcriptId, err: (err as Error).message },
      "assemblyai: transcript deletion threw — PHI may remain on AssemblyAI servers",
    );
  }
}

export async function createTranscript(
  opts: CreateTranscriptOptions,
): Promise<string> {
  assertBaaConfirmed();
  assertAllowedHost(opts.audioUrl);

  const apiKey = getApiKey();
  const speechModel = opts.speechModel ?? "universal";
  const medicalMode = opts.medicalMode ?? false;

  const body = {
    audio_url: opts.audioUrl,
    speech_model: speechModel,   // singular string — AssemblyAI v2 API field name
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
    // Never log errorText — AssemblyAI errors may echo back the audio_url (presigned S3 URL containing PHI paths).
    logger.error(
      { status: response.status },
      "assemblyai: createTranscript failed",
    );
    throw new Error(`AssemblyAI transcript creation failed (${response.status})`);
  }

  const data = parseTranscriptResponse(await response.json());
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
      // Never log errorText — may contain PHI-adjacent data.
      logger.error(
        { status: response.status, transcriptId },
        "assemblyai: pollTranscript failed",
      );
      throw new Error(`AssemblyAI poll failed (${response.status})`);
    }

    const data = parseTranscriptResponse(await response.json());

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
        confidence: data.confidence ?? null,
        audioDurationSeconds: data.audio_duration ?? null,
        languageCode: data.language_code ?? null,
        modelVersion: "assemblyai-universal",
      };
    }

    if (data.status === "error") {
      // Never log data.error — AssemblyAI error messages may contain transcript fragments.
      logger.error({ transcriptId }, "assemblyai: remote transcription error");
      throw new Error("AssemblyAI transcription failed");
    }

    if (data.status === "queued" || data.status === "processing") {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      continue;
    }

    // Unknown status — fail fast rather than burning the timeout window.
    logger.error(
      { transcriptId, status: data.status },
      "assemblyai: unrecognized transcript status",
    );
    throw new Error(`assemblyai: unrecognized transcript status '${data.status}'`);
  }

  logger.error({ transcriptId }, "assemblyai: poll timeout");
  throw new Error("AssemblyAI transcription timed out");
}

export async function transcribeFromUrl(
  audioUrl: string,
  opts: Omit<CreateTranscriptOptions, "audioUrl"> = {},
): Promise<TranscriptResult> {
  const transcriptId = await createTranscript({ audioUrl, ...opts });
  let result: TranscriptResult;
  try {
    result = await pollTranscript(transcriptId);
  } catch (err) {
    // Best-effort deletion even on failure — PHI must not linger on AssemblyAI servers.
    await deleteTranscript(transcriptId);
    throw err;
  }

  // Delete the remote transcript immediately after retrieval — minimum necessary retention.
  await deleteTranscript(transcriptId);

  if (opts.medicalMode) {
    return { ...result, modelVersion: `${result.modelVersion}-medical` };
  }
  return result;
}
