import { z } from "zod";
import api from "./axios";

// SECURITY: File validation constants — enforced before upload to prevent
// server-side abuse from oversized or unsupported file types.
const ALLOWED_AUDIO_TYPES = [
  "audio/wav",
  "audio/mpeg",       // .mp3
  "audio/mp4",        // .m4a / .mp4 audio
  "audio/ogg",
  "audio/webm",
  "audio/x-wav",
  "audio/flac",
];

// 200 MB — large enough for a full clinical encounter recording
const MAX_AUDIO_SIZE_BYTES = 200 * 1024 * 1024;

export class AudioValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AudioValidationError";
  }
}

function validateAudioFile(file: File): void {
  if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
    throw new AudioValidationError(
      `Unsupported file type "${file.type}". Allowed: ${ALLOWED_AUDIO_TYPES.join(", ")}`,
    );
  }
  if (file.size > MAX_AUDIO_SIZE_BYTES) {
    throw new AudioValidationError(
      `File size ${(file.size / 1024 / 1024).toFixed(1)} MB exceeds the 200 MB limit.`,
    );
  }
}

const TranscribeS3Schema = z.object({
  s3Key: z.string().min(1),
  encounterId: z.string().uuid("Invalid encounter ID format"),
});

export type TranscribeS3Payload = z.infer<typeof TranscribeS3Schema>;

export const transcribeApi = {
  // SECURITY: File is validated client-side before upload.
  // uploadOnly=true uploads to S3 without triggering transcription immediately —
  // transcription is started separately via transcribeS3(). This is an internal
  // workflow flag, not user-controlled input; it is safe to keep as a typed param.
  uploadAudio: (formData: FormData, uploadOnly = false) => {
    const file = formData.get("audio");
    if (file instanceof File) {
      validateAudioFile(file);
    }
    return api.post(
      `/transcribe${uploadOnly ? "?upload_only=true" : ""}`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
  },

  transcribeS3: (data: TranscribeS3Payload) =>
    api.post("/transcribe", TranscribeS3Schema.parse(data)),

  getByEncounterId: (encounterId: string) =>
    api.get(`/transcribe/${encodeURIComponent(z.string().uuid().parse(encounterId))}`),

  getAudioUrl: (encounterId: string) =>
    api.get(`/transcribe/audio/${encodeURIComponent(z.string().uuid().parse(encounterId))}`),

  saveTranscript: (encounterId: string, text: string) =>
    api.put(
      `/transcribe/${encodeURIComponent(z.string().uuid().parse(encounterId))}`,
      { text: z.string().max(200_000).parse(text) },
    ),
};
