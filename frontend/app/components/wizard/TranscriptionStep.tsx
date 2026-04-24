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
    transcribeError: string | null;
    transcriptDraft: string;
    onTranscriptDraftChange: (value: string) => void;
    onSaveTranscript: () => void;
    savingTranscript: boolean;
    uploading: boolean;
    uploadError: string | null;
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
    transcribeError,
    transcriptDraft,
    onTranscriptDraftChange,
    onSaveTranscript,
    savingTranscript,
    uploading,
    uploadError,
    transcribing,
    onAudioSelected,
    onClearAudio,
    onTranscribe,
    allowedAudioTypes,
}: TranscriptionStepProps) {
    const transcriptText = (() => {
        if (!transcript) return null;
        if (typeof transcript === "string") return transcript;

        // Handle explicit empty text result from Whisper
        if (transcript.encrypted !== undefined) return null;
        if (transcript.text === "") {
            return "No speech detected in the audio file.";
        }

        return (
            transcript.text ||
            transcript.summary ||
            JSON.stringify(transcript, null, 2)
        );
    })();

    logger.log("TranscriptionStep render:", { audioFile: !!audioFile, hasAudio: !!audioUrl, hasS3: !!s3Key, transcriptText: !!transcriptText });

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
                    <audio
                        key={audioUrl}
                        controls
                        src={audioUrl}
                        className="w-full"
                        onError={(e) => {
                            const err = (e.target as HTMLAudioElement).error;
                            logger.error("Audio playback error", err?.message ?? err?.code);
                        }}
                    />
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

            {uploadError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <strong>Upload failed:</strong> {uploadError}
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
                            <div className="flex gap-2">
                                <Button
                                    onClick={onTranscribe}
                                    loading={transcribing}
                                    disabled={transcribing || uploading || !s3Key}
                                >
                                    {transcribing ? "Transcribing..." : "Transcribe Audio"}
                                </Button>
                            </div>
                        )}
                    </div>
                    {!s3Key && !uploading && !transcript && (
                        <p className="mb-4 text-sm text-amber-700">
                            Audio must finish uploading before transcription can start.
                        </p>
                    )}
                    {transcribeError && (
                        <p className="mb-4 text-sm text-red-600">{transcribeError}</p>
                    )}

                    {transcribing && (
                        <div className="text-center py-8">
                            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-b-transparent" />
                            <p className="text-sm text-slate-600 mt-2">Transcribing audio...</p>
                        </div>
                    )}

                    {transcribeError && !transcribing && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            <strong>Transcription failed:</strong> {transcribeError}
                        </div>
                    )}

                    {transcriptText && !transcribing && (
                        <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-3">
                            <p className="text-xs font-medium text-slate-700">Transcript (editable)</p>
            <div className="flex flex-wrap gap-2 mb-2">
                {transcriptText && (
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => onTranscriptDraftChange(transcriptText)}
                    >
                        Use original transcription
                    </Button>
                )}
                <span className="text-xs text-slate-500">
                    {transcriptText && transcriptDraft.trim() !== transcriptText.trim() ? "Edited transcript" : "Original transcript"}
                </span>
            </div>
                            <textarea
                                id="transcript-draft"
                                name="transcript-draft"
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
