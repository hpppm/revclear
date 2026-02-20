"use client";

import AudioRecorder from "../AudioRecorder";
import AudioUploader from "../AudioUploader";
import Button from "../ui/Button";
import logger from "@/app/lib/logger";

interface TranscriptionStepProps {
    audioFile: File | null;
    audioUrl: string | null;
    s3Key: string | null;
    transcript: any;
    transcriptDraft: string;
    onTranscriptDraftChange: (value: string) => void;
    onSaveTranscript: () => void;
    savingTranscript: boolean;
    uploading: boolean;
    transcribing: boolean;
    onAudioSelected: (file: File) => void;
    onClearAudio: () => void;
    onTranscribe: () => void;
    allowedAudioTypes: string[];
}

export default function TranscriptionStep({
    audioFile,
    audioUrl,
    s3Key,
    transcript,
    transcriptDraft,
    onTranscriptDraftChange,
    onSaveTranscript,
    savingTranscript,
    uploading,
    transcribing,
    onAudioSelected,
    onClearAudio,
    onTranscribe,
    allowedAudioTypes,
}: TranscriptionStepProps) {
    const demoTranscript = `Chief Complaint: Patient presents with chronic low back pain that has worsened over the past 2 weeks.\n\nHistory of Present Illness:\n- 45-year-old male with 6-month history of intermittent low back pain, now constant.\n- Pain is 6/10, sharp with movement, dull ache at rest; radiates intermittently to left posterior thigh, no below-knee radiation.\n- Worse with prolonged sitting, bending, lifting; improved with rest and ibuprofen 400 mg PRN.\n- No red flags: denies bowel/bladder changes, saddle anesthesia, significant weight loss, fever, or trauma.\n- Work: desk-based; notes poor ergonomics, minimal stretching.\n\nPast Medical History:\n- Hypertension, controlled with lisinopril 10 mg daily.\n- No prior spine surgery.\n\nMedications:\n- Lisinopril 10 mg daily.\n- Ibuprofen 400 mg PRN (takes 2–3x/week).\n\nAllergies: NKDA.\n\nSocial History:\n- Office worker, sedentary; exercises 1–2x/week (walking).\n- Non-smoker; occasional alcohol.\n\nReview of Systems:\n- Negative for weight loss, fever, night sweats.\n- Negative for incontinence, numbness, tingling in feet.\n\nPhysical Exam:\n- Vitals: BP 128/78, HR 72, afebrile.\n- General: no acute distress.\n- Back: mild left paraspinal tenderness at L4-L5; no midline step-off.\n- ROM: flexion limited by pain; extension mild discomfort.\n- Neuro: Strength 5/5 in BLE; sensation intact; reflexes 2+ patellar/Achilles; negative straight leg raise bilaterally.\n- Gait: normal.\n\nAssessment:\n- Mechanical low back pain with probable myofascial component; no radicular deficits or red flags.\n\nPlan:\n- Meds: Continue ibuprofen PRN with food; add short course of scheduled NSAID if needed; consider muscle relaxant at night if spasms persist.\n- PT: Core strengthening, McGill exercises, hip mobility, hamstring stretching; posture and ergonomic education; avoid prolonged sitting.\n- Activity: Relative rest; avoid heavy lifting/twisting for 1–2 weeks; walking encouraged.\n- Work: Recommend ergonomic assessment and sit-stand desk if available; hourly micro-breaks and stretching.\n- Imaging: Not indicated now; consider MRI if no improvement after 6–8 weeks or if red flags emerge.\n- Follow-up: 4–6 weeks or sooner if worsening, new neuro deficits, or red flags.\n`;

    const transcriptText = (() => {
        if (!transcript) return null;
        if (typeof transcript === "string") return transcript;

        // Handle explicit empty text result from Whisper
        if (transcript.text === "") {
            return "No speech detected in the audio file.";
        }

        return (
            transcript.text ||
            transcript.summary ||
            JSON.stringify(transcript, null, 2)
        );
    })();

    logger.log("TranscriptionStep render:", { hasAudio: !!audioFile, hasUrl: !!audioUrl, hasS3Key: !!s3Key, hasTranscript: !!transcript });

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold text-slate-900 mb-2">Transcription</h2>
                <p className="text-slate-600">
                    Record or upload audio, then transcribe it.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AudioRecorder onRecorded={onAudioSelected} />
                <AudioUploader
                    accept={allowedAudioTypes}
                    maxSizeMB={25}
                    onFileSelect={onAudioSelected}
                />
            </div>

            {audioUrl ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-700">Selected Audio</p>
                            <p className="text-xs text-slate-500">{audioFile?.name}</p>
                            {audioFile && (
                                <p className="text-xs text-slate-500">
                                    {(audioFile.size / 1024 / 1024).toFixed(1)} MB
                                </p>
                            )}
                        </div>
                        <Button variant="secondary" size="sm" onClick={onClearAudio}>
                            Clear
                        </Button>
                    </div>
                    <audio controls src={audioUrl} className="w-full" />
                </div>
            ) : s3Key ? (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" x2="12" y1="3" y2="15" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-blue-900">Audio Uploaded</p>
                        <p className="text-xs text-blue-700">
                            Ready to transcribe from previous session.
                        </p>
                    </div>
                </div>
            ) : null}

            {uploading && (
                <div className="text-center py-4">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-b-transparent" />
                    <p className="text-sm text-slate-600 mt-2">Uploading audio...</p>
                </div>
            )}

            {(audioFile || s3Key) && (
                <div className="border-t border-slate-200 pt-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">Transcript</h3>
                            <p className="text-sm text-slate-600">
                                Generate a transcript from the audio
                            </p>
                        </div>
                        {!transcript && (
                            <Button
                                onClick={onTranscribe}
                                loading={transcribing}
                                disabled={transcribing || uploading}
                            >
                                {transcribing ? "Transcribing..." : "Transcribe Audio"}
                            </Button>
                        )}
                    </div>

                    {transcribing && (
                        <div className="text-center py-8">
                            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-b-transparent" />
                            <p className="text-sm text-slate-600 mt-2">Transcribing audio...</p>
                        </div>
                    )}

                    {transcriptText && !transcribing && (
                        <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-3">
                            <p className="text-xs font-medium text-slate-700">Transcript (editable)</p>
            <div className="flex flex-wrap gap-2 mb-2">
                <button
                    type="button"
                    onClick={() => onTranscriptDraftChange(demoTranscript)}
                    className="inline-flex items-center gap-2 rounded-md border border-dashed border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                >
                    Demo transcript
                </button>
                {transcriptText && (
                    <button
                        type="button"
                        onClick={() => onTranscriptDraftChange(transcriptText)}
                        className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-400"
                    >
                        Use original transcription
                    </button>
                )}
                <span className="text-xs text-slate-500">
                    Using: {transcriptDraft.trim() === demoTranscript.trim() ? "Demo transcript" : "Original / edited transcript"}
                </span>
            </div>
                            <textarea
                                value={transcriptDraft}
                                onChange={(e) => onTranscriptDraftChange(e.target.value)}
                                rows={10}
                                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                            <div className="flex gap-2">
                                <Button
                                    onClick={onSaveTranscript}
                                    loading={savingTranscript}
                                    disabled={savingTranscript || !transcriptDraft.trim()}
                                >
                                    {savingTranscript ? "Saving..." : "Save transcript"}
                                </Button>
                            </div>
                        </div>
                    )}

                    {!transcript && !transcribing && (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                            Click "Transcribe Audio" to generate a transcript.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
