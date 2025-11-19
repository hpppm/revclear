import { Router } from "express";
import multer from "multer";
import { spawn } from 'child_process';
import { writeFile, unlink, access, constants } from 'fs/promises'; // Import access and constants
import path from 'path';
import { authMiddleware } from "../../middleware/auth";

const router = Router();

// Configure multer for in-memory file storage.
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Define the path to your Python Whisper transcription script
const WHISPER_SCRIPT_PATH = path.join(process.cwd(), 'python', 'whisper.py');
// Define the path to your Python executable within your virtual environment
const PYTHON_EXECUTABLE_PATH = path.join(process.cwd(), 'venv', 'bin', 'python'); // Assuming Linux/macOS venv structure

/**
 * @route POST /api/transcribe
 * @description Accepts an audio file for transcription, processes it using a Python Whisper service.
 */
router.post(
  "/",
  authMiddleware,
  upload.single("audio"), // The form field name for the audio file must be "audio"
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided." });
    }

    if (!req.file.mimetype.startsWith('audio/')) {
        return res.status(400).json({ error: "Provided file is not an audio file." });
    }

    let tempAudioFilePath: string | undefined;

    try {
      // 1. Save the received audio file buffer to a temporary file
      const originalExtension = path.extname(req.file.originalname);
      const tempFileName = `audio-${Date.now()}-${Math.random().toString(36).substring(2, 15)}${originalExtension || '.wav'}`;
      tempAudioFilePath = path.join('/tmp', tempFileName); // Use /tmp for temporary storage

      await writeFile(tempAudioFilePath, req.file.buffer);
      console.log(`Backend: Saved temporary audio to ${tempAudioFilePath}`);

      // 2. Spawn a Python child process to run the Whisper script
      const pythonProcess = spawn(PYTHON_EXECUTABLE_PATH, [WHISPER_SCRIPT_PATH, tempAudioFilePath]);

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
            const fullError = `Python script exited with code ${code}. Stderr: ${pythonError}. Stdout: ${pythonOutput}`;
            console.error(`Backend: Python script error - ${fullError}`);
            return reject(new Error(`Whisper transcription failed: ${pythonError || 'Unknown Python error.'}`));
          }
          resolve();
        });
        pythonProcess.on('error', (err) => {
            console.error('Backend: Failed to start Python child process:', err);
            reject(new Error(`Failed to start Whisper service: ${err.message}. Ensure Python is in PATH and script is executable.`));
        });
      });

      // 3. Parse the JSON transcript from Python's stdout
      const transcript = JSON.parse(pythonOutput);
      console.log(`Backend: Transcription successful for ${req.file.originalname}`);
      console.log(`Backend: Preparing to send response for ${req.file.originalname}`);

      try {
        res.json({
          success: true,
          message: `Transcription complete for ${req.file.originalname}.`,
          transcript: transcript,
        });
        console.log("Backend: Response sent successfully.");
      } catch (jsonError: any) {
        console.error("Backend: Error sending JSON response:", jsonError);
        // Fallback error response
        res.status(500).json({ error: "Failed to send transcription response." });
      }

    } catch (error: any) {
      console.error("Backend: Transcription processing error:", error);
      res.status(500).json({ error: error.message || "Failed to process audio file." });
    } finally {
      // Ensure file cleanup only if it exists
      if (tempAudioFilePath) {
        try {
          // Check if file exists before trying to unlink
          await access(tempAudioFilePath, constants.F_OK);
          await unlink(tempAudioFilePath);
          console.log(`Backend: Deleted temporary file: ${tempAudioFilePath}`);
        } catch (err: any) {
          if (err.code === 'ENOENT') {
            console.log(`Backend: Temporary file already deleted or never created: ${tempAudioFilePath}`);
          } else {
            console.error(`Backend: Failed to delete temporary file ${tempAudioFilePath}:`, err);
          }
        }
      }
    }
  }
);

export default router;