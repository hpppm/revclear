import { Router, json } from "express";
import multer from "multer";
import { spawn } from "child_process";
import path from "path";
import { z } from "zod";
import { Readable } from "stream";
import { authMiddleware } from "../../middleware/auth";
import { uploadFile, getFile } from "../../config/awsS3";
import { createAudioRecord, createAiResult } from "../../db/queries";
import { sendError } from "../../utils/httpResponses";

const router = Router();

// Configure multer for in-memory file storage.
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Define the path to your Python Whisper transcription script
const WHISPER_SCRIPT_PATH = path.join(process.cwd(), 'src', 'python', 'whisper.py');
// Define the path to your Python executable (using venv)
const PYTHON_EXECUTABLE_PATH = path.join(process.cwd(), 'venv', 'bin', 'python3');

// Zod schema for S3 fallback request
const S3FallbackSchema = z.object({
  s3Key: z.string().min(1, "s3Key cannot be empty"),
  encounterId: z.string().uuid("Invalid encounter ID"),
});

/**
 * @route POST /api/transcribe
 * @description Accepts an audio file for transcription or an S3 key to transcribe an existing file.
 * Handles two scenarios:
 * 1. Direct audio file upload (multipart/form-data with "audio" field).
 * 2. S3 fallback (application/json with "s3Key" and "encounterId").
 */
router.post(
  "/",
  authMiddleware,
  json(),
  upload.single("audio"),
  async (req, res) => {
    try {
      let audioStream: Readable;
      let s3Key: string;
      const encounterId = req.body.encounterId; // Assuming encounterId is passed for both paths

      if (!encounterId) {
        return sendError(res, 400, "Encounter ID is required.");
      }

      if (req.file) {
        // --- Path 1: Direct Audio Upload ---
        if (!req.file.mimetype.startsWith("audio/")) {
          return sendError(res, 400, "Provided file is not an audio file.");
        }

        // Generate a unique S3 key
        const originalExtension = path.extname(req.file.originalname);
        s3Key = `audio/encounter_${encounterId}_${Date.now()}${originalExtension || ".tmp"}`;

        // Upload to S3
        await uploadFile(s3Key, req.file.buffer, req.file.mimetype);
        console.log(`Backend: Uploaded audio to S3 with key: ${s3Key}`);

        // Create a record in audio_records table
        await createAudioRecord({
          encounter_id: encounterId,
          file_url: s3Key,
          transcription_status: "uploaded",
        });

        // Check if upload_only is requested
        if (req.query.upload_only === 'true') {
          return res.json({
            success: true,
            message: "Audio uploaded successfully.",
            s3Key: s3Key,
          });
        }

        // Get a readable stream from the buffer to pass to Whisper
        audioStream = Readable.from(req.file.buffer);

      } else {
        // --- Path 2: S3 Fallback ---
        const validation = S3FallbackSchema.safeParse(req.body);
        if (!validation.success) {
          return sendError(
            res,
            400,
            "Invalid request body for S3 fallback.",
            validation.error.issues
          );
        }

        s3Key = validation.data.s3Key;

        // Get file stream from S3
        const s3File = await getFile(s3Key);
        if (!s3File.Body) {
          throw new Error("Failed to retrieve file from S3.");
        }
        audioStream = s3File.Body as Readable;
      }

      // --- Universal Transcription Process ---
      const pythonProcess = spawn(PYTHON_EXECUTABLE_PATH, [WHISPER_SCRIPT_PATH]);

      // Pipe the audio stream to the Python script's stdin
      audioStream.pipe(pythonProcess.stdin);

      let pythonOutput = '';
      let pythonError = '';

      pythonProcess.stdout.on('data', (data) => {
        pythonOutput += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        pythonError += data.toString();
      });

      await new Promise<void>((resolve, reject) => {
        pythonProcess.on('close', (code) => {
          if (code !== 0) {
            const fullError = `Python script exited with code ${code}. Stderr: ${pythonError}.`;
            console.error(`Backend: Python script error - ${fullError}`);
            return reject(new Error(`Whisper transcription failed: ${pythonError || 'Unknown Python error.'}`));
          }
          resolve();
        });
        pythonProcess.on('error', (err) => {
          console.error('Backend: Failed to start Python child process:', err);
          reject(new Error(`Failed to start Whisper service: ${err.message}.`));
        });
      });

      const transcript = JSON.parse(pythonOutput);
      console.log(`Backend: Transcription successful for S3 key: ${s3Key}`);

      // Persist transcript to ai_results table
      await createAiResult({
        encounter_id: encounterId,
        flow_name: "whisper_transcript",
        input_json: { s3Key },
        output_json: transcript,
        model_version: transcript?.model_version || "whisper",
        confidence_score: transcript?.confidence_score,
      });

      res.json({
        success: true,
        message: `Transcription complete.`,
        s3Key: s3Key,
        transcript: transcript,
      });

    } catch (error: any) {
      console.error("Backend: Transcription processing error:", error);
      sendError(res, 500, error.message || "Failed to process audio file.");
    }
  }
);

export default router;
