import { Router, json } from "express";
import multer from "multer";
import path from "path";
import { Readable } from "stream";
import { z } from "zod";
import { IdParamSchema } from "../../types/zod";
import FormData from "form-data";
import fetch from "node-fetch";
import { authMiddleware } from "../../middleware/auth";
import { requireOrganization } from "../../middleware/context";
import { requireCapability } from "../../middleware/authorization";
import { getFile, uploadFile } from "../../config/awsS3";
import { createAudioRecord, createAiResult, getLatestAiResult } from "../../db/queries";
import { sendError } from "../../utils/httpResponses";
import { query } from "../../config/db";
import { AI_FLOW_NAMES } from "../../constants/aiFlows";
import logger from "../../utils/logger";

const router = Router();

// Configure multer for in-memory file storage with security limits.
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
    files: 1, // Only allow 1 file per request
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(new Error("Only audio files are allowed"));
    }
  },
});

// AI server URL from environment (prefer AI_TRANSCRIBE_URL, support TRANSCRIBE_URL).
const AI_TRANSCRIBE_URL =
  process.env.AI_TRANSCRIBE_URL ||
  process.env.TRANSCRIBE_API_URL ||
  process.env.TRANSCRIBE_URL;
const AI_SERVER_API_KEY = process.env.AI_SERVER_API_KEY || "";

const TranscriptUpdateSchema = z.object({
  text: z.string().min(1, "Transcript text is required"),
});


// SECURITY: Require BOTH clinician_id AND organization_id — prevents cross-clinician
// access within the same organization. Using OR would allow any clinician in the
// org to access another clinician's PHI data.
const ensureEncounterOwnership = async (
  encounterId: string,
  clinicianId: string,
  organizationId?: string,
) => {
  const result = await query(
    `SELECT id FROM encounters WHERE id = $1 AND clinician_id = $2 AND organization_id = $3`,
    [encounterId, clinicianId, organizationId || null],
  );
  return result.rows.length > 0;
};

const getLatestEncounterAudioKey = async (encounterId: string) => {
  const result = await query(
    `SELECT file_url
     FROM audio_records
     WHERE encounter_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [encounterId],
  );

  return result.rows[0]?.file_url as string | undefined;
};

const streamToBuffer = async (stream: Readable): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

/**
 * @route POST /api/transcribe
 * @description Accepts an audio file for transcription
 */
router.post(
  "/",
  authMiddleware,
  requireOrganization,
  requireCapability("use_clinical_ai"),
  json(),
  upload.single("audio"),
  async (req, res) => {
    try {
      const user = req.user!;
      const organizationId = req.organization!.id;

      const parsedId = IdParamSchema.safeParse({ id: req.body.encounterId });
      if (!parsedId.success) {
        return sendError(res, 400, "Valid encounter ID is required.");
      }
      const encounterId = parsedId.data.id;

      // Ensure the encounter belongs to the authenticated clinician
      const ownsEncounter = await ensureEncounterOwnership(
        encounterId,
        user.id,
        organizationId,
      );

      if (!ownsEncounter) {
        return sendError(res, 404, "Encounter not found");
      }

      let s3Key = "";
      let audioBuffer: Buffer;
      let audioFilename = "audio.webm";
      let audioContentType = "application/octet-stream";

      if (req.file) {
        if (!req.file.mimetype.startsWith("audio/")) {
          return sendError(res, 400, "Provided file is not an audio file.");
        }

        // Generate a unique S3 key scoped to the organization.
        // Path: audio/{orgId}/encounter_{encounterId}_{timestamp}{ext}
        // This enforces tenant isolation at the storage layer — each org's
        // audio lives under its own prefix, matching the IAM policy condition
        // on the Cognito Identity Pool role.
        const originalExtension = path.extname(req.file.originalname);
        const orgPrefix = organizationId;
        s3Key = `audio/${orgPrefix}/encounter_${encounterId}_${Date.now()}${originalExtension || ".tmp"}`;

        // Upload to S3
        await uploadFile(s3Key, req.file.buffer, req.file.mimetype);
        logger.info({ encounterId, s3Key }, "transcribe: audio uploaded to S3");

        // Create a record in audio_records table
        await createAudioRecord({
          encounter_id: encounterId,
          file_url: s3Key,
          transcription_status: "uploaded",
        });

        // Check if upload_only is requested
        if (req.query.upload_only === "true") {
          return res.json({
            success: true,
            message: "Audio uploaded successfully.",
          });
        }

        audioBuffer = req.file.buffer;
        audioFilename = req.file.originalname || audioFilename;
        audioContentType = req.file.mimetype || audioContentType;
      } else {
        // Look up the S3 key server-side — never accept it from the client.
        s3Key = await getLatestEncounterAudioKey(encounterId) ?? "";
        if (!s3Key) {
          return sendError(res, 404, "No uploaded audio found for this encounter.");
        }

        const s3Object = await getFile(s3Key);
        if (!s3Object.Body) {
          throw new Error(`S3 object has no body for key: ${s3Key}`);
        }

        audioBuffer = await streamToBuffer(s3Object.Body as Readable);
        audioFilename = path.basename(s3Key) || audioFilename;
        audioContentType = s3Object.ContentType || audioContentType;
        logger.info(
          { encounterId, s3Key },
          "transcribe: loaded audio from S3 for transcription",
        );
      }

      if (!AI_TRANSCRIBE_URL) {
        logger.error(
          "transcribe: missing AI_TRANSCRIBE_URL/TRANSCRIBE_API_URL/TRANSCRIBE_URL configuration",
        );
        return sendError(
          res,
          500,
          "AI transcription URL is not configured (AI_TRANSCRIBE_URL, TRANSCRIBE_API_URL, or TRANSCRIBE_URL)",
        );
      }

      if (AI_SERVER_API_KEY) {
        logger.debug("transcribe: using AI_SERVER_API_KEY for authentication");
      } else {
        logger.debug("transcribe: no AI_SERVER_API_KEY set, proceeding without auth header");
      }

      // --- Call AI Server for Transcription ---
      logger.debug(
        { encounterId, url: AI_TRANSCRIBE_URL },
        "transcribe: sending to AI server",
      );

      const formData = new FormData();
      formData.append("audio", audioBuffer, {
        filename: audioFilename,
        contentType: audioContentType,
      });

      const aiAbort = new AbortController();
      const aiTimeout = setTimeout(() => aiAbort.abort(), 110_000);
      let response: Awaited<ReturnType<typeof fetch>>;
      try {
        response = await fetch(AI_TRANSCRIBE_URL, {
          method: "POST",
          body: formData as any,
          headers: {
            ...formData.getHeaders(),
            ...(AI_SERVER_API_KEY ? { "X-API-Key": AI_SERVER_API_KEY } : {}),
          },
          signal: aiAbort.signal,
        });
      } finally {
        clearTimeout(aiTimeout);
      }

      logger.debug({ status: response.status }, "transcribe: AI server response");

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(
          { status: response.status, error: errorText },
          "transcribe: AI server error",
        );
        throw new Error(
          `AI transcription failed (${response.status}): ${errorText}`,
        );
      }

      const aiResponse = (await response.json()) as { transcript: string };
      logger.debug(
        { hasTranscript: !!aiResponse.transcript },
        "transcribe: parsed AI response",
      );

      const transcript = {
        text: aiResponse.transcript,
        model_version: `whisper-${process.env.WHISPER_MODEL ?? "tiny"}`,
      };

      logger.info(
        { encounterId, s3Key },
        "transcribe: transcription successful",
      );

      // Persist transcript to ai_results table
      const aiResult = await createAiResult({
        encounter_id: encounterId,
        flow_name: AI_FLOW_NAMES.transcript,
        input_json: { s3Key },
        output_json: transcript,
        model_version: transcript.model_version,
        confidence_score: undefined,
      });

      // Update encounter with transcript_result_id
      await query(
        `UPDATE encounters SET transcript_result_id = $1 WHERE id = $2`,
        [aiResult.id, encounterId],
      );
      logger.debug(
        { encounterId, aiResultId: aiResult.id },
        "transcribe: encounter updated with transcript_result_id",
      );

      res.json({
        success: true,
        message: "Transcription complete.",
        transcript: transcript,
      });
    } catch (error: any) {
      logger.error({ err: error }, "transcribe: processing error");
      sendError(res, 500, "Failed to process audio file");
    }
  }
);

/**
 * @route GET /api/transcribe/audio/:encounterId
 * @description Gets a presigned URL for the audio file
 */
router.get("/audio/:encounterId", authMiddleware, requireOrganization, requireCapability("use_clinical_ai"), async (req, res) => {
  try {
    const user = req.user!;
    const organizationId = req.organization!.id;

    const { encounterId } = req.params;

    if (!encounterId) {
      return sendError(res, 400, "Encounter ID is required.");
    }

    const ownsEncounter = await ensureEncounterOwnership(
      encounterId,
      user.id,
      organizationId,
    );
    if (!ownsEncounter) {
      return sendError(res, 404, "Encounter not found");
    }

    const audioKey = await getLatestEncounterAudioKey(encounterId);

    if (!audioKey) {
      return sendError(res, 404, "Audio file not found for this encounter.");
    }

    // Generate presigned URL
    const { getDownloadUrl } = await import("../../config/awsS3");
    const audioUrl = await getDownloadUrl(audioKey, 3600); // 1 hour expiry

    res.json({ audioUrl });
  } catch (error: any) {
    logger.error({ err: error }, "transcribe: error getting audio URL");
    sendError(res, 500, "Failed to get audio URL");
  }
});

/**
 * @route GET /api/transcribe/:encounterId
 * @description Retrieves the transcript for a given encounter
 */
router.get("/:encounterId", authMiddleware, requireOrganization, requireCapability("use_clinical_ai"), async (req, res) => {
  try {
    const user = req.user!;
    const organizationId = req.organization!.id;

    const { encounterId } = req.params;

    if (!encounterId) {
      return sendError(res, 400, "Encounter ID is required.");
    }

    const ownsEncounter = await ensureEncounterOwnership(
      encounterId,
      user.id,
      organizationId,
    );
    if (!ownsEncounter) {
      return sendError(res, 404, "Encounter not found");
    }

    const result = await getLatestAiResult(encounterId, AI_FLOW_NAMES.transcript);

    if (!result) {
      return sendError(res, 404, "Transcript not found for this encounter.");
    }

    res.json(result.output_json);
  } catch (error: any) {
    logger.error({ err: error }, "transcribe: error retrieving transcript");
    sendError(res, 500, "Failed to retrieve transcript");
  }
});

/**
 * @route PUT /api/transcribe/:encounterId
 * @description Save/overwrite transcript text for an encounter (e.g., after manual edits).
 */
router.put("/:encounterId", authMiddleware, requireOrganization, requireCapability("use_clinical_ai"), json(), async (req, res) => {
  try {
    const user = req.user!;
    const organizationId = req.organization!.id;

    const { encounterId } = req.params;
    if (!encounterId) {
      return sendError(res, 400, "Encounter ID is required.");
    }

    const parsedBody = TranscriptUpdateSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return sendError(
        res,
        400,
        "Invalid transcript payload",
        parsedBody.error.issues,
      );
    }

    const ownsEncounter = await ensureEncounterOwnership(
      encounterId,
      user.id,
      organizationId,
    );
    if (!ownsEncounter) {
      return sendError(res, 404, "Encounter not found");
    }

    // Persist edited transcript as a new ai_results row
    const aiResult = await createAiResult({
      encounter_id: encounterId,
      flow_name: AI_FLOW_NAMES.transcript,
      input_json: { source: "manual_edit" },
      output_json: { text: parsedBody.data.text },
      model_version: "manual_edit",
      confidence_score: undefined,
    });

    // Update encounter pointer to latest transcript
    await query(
      `UPDATE encounters SET transcript_result_id = $1 WHERE id = $2`,
      [aiResult.id, encounterId],
    );

    return res.json({
      success: true,
      transcript: aiResult.output_json,
      aiResultId: aiResult.id,
    });
  } catch (error: any) {
    logger.error({ err: error }, "transcribe: error saving transcript");
    sendError(res, 500, "Failed to save transcript");
  }
});

export default router;
