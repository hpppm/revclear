"use client";

import { useEffect, useState } from "react";
import Button from "../ui/Button";
import SoapNoteViewer from "../SoapNoteViewer";
import logger from "@/app/lib/logger";
import { SoapNote } from "@/app/lib/types";

type TranscriptPayload =
    | string
    | {
          text?: string;
          summary?: string;
      }
    | Record<string, unknown>
    | null;

interface SoapGenerationStepProps {
    transcript: TranscriptPayload;
    soap: SoapNote | null;
    generatingSoap: boolean;
    onGenerateSoap: () => void;
    onSaveSoap?: (soap: SoapNote) => Promise<void>;
}

export default function SoapGenerationStep({
    transcript,
    soap,
    generatingSoap,
    onGenerateSoap,
    onSaveSoap,
}: SoapGenerationStepProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedSoap, setEditedSoap] = useState<SoapNote | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (soap) {
            setEditedSoap(soap);
        }
    }, [soap]);

    const handleEdit = () => {
        setEditedSoap(soap);
        setIsEditing(true);
    };

    const handleCancel = () => {
        setEditedSoap(soap);
        setIsEditing(false);
    };

    const handleSave = async () => {
        if (!onSaveSoap || !editedSoap) return;
        setSaving(true);
        try {
            await onSaveSoap(editedSoap);
            setIsEditing(false);
        } catch (error) {
            logger.error("Failed to save SOAP note", error);
        } finally {
            setSaving(false);
        }
    };

    const handleFieldChange = (field: keyof SoapNote, value: string) => {
        setEditedSoap((prev) => ({
            ...(prev || {}),
            [field]: value,
        }));
    };

    const transcriptText = (() => {
        if (!transcript) return null;
        if (typeof transcript === "string") return transcript;

        // Handle explicit empty text result from Whisper
        if (typeof transcript === "object" && transcript && "text" in transcript && transcript.text === "") {
            return "No speech detected in the audio file.";
        }

        return (
            (typeof transcript === "object" && transcript && "text" in transcript ? transcript.text : undefined) ||
            (typeof transcript === "object" && transcript && "summary" in transcript ? transcript.summary : undefined) ||
            JSON.stringify(transcript ?? {}, null, 2)
        );
    })();

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-5">
            {/* Left — transcript aligned to first SOAP card */}
            <div className="flex flex-col gap-3">
                {/* Spacer matches the height of the SOAP NOTE label row on the right */}
                <div className="flex items-center" style={{ minHeight: "3.25rem" }}>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Transcript</p>
                </div>
                <div className="flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-end">
                        {transcriptText && !soap && (
                            <Button
                                size="sm"
                                onClick={onGenerateSoap}
                                loading={generatingSoap}
                                disabled={generatingSoap}
                            >
                                Generate SOAP
                            </Button>
                        )}
                    </div>
                    <div className="flex-1 p-4 overflow-auto max-h-[480px]">
                        {transcriptText ? (
                            <pre className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed font-sans">
                                {String(transcriptText ?? "")}
                            </pre>
                        ) : (
                            <p className="text-sm text-slate-400 italic">No transcript available.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Right — SOAP Note aligned to subtitle */}
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between" style={{ minHeight: "3.25rem" }}>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-900">SOAP Note</p>
                    {soap && (
                        <div className="flex gap-2">
                            {isEditing ? (
                                <>
                                    <Button size="sm" onClick={handleSave} loading={saving} disabled={saving}>
                                        Save Changes
                                    </Button>
                                    <Button size="sm" variant="secondary" onClick={handleCancel} disabled={saving}>
                                        Cancel
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button size="sm" variant="secondary" onClick={handleEdit} disabled={generatingSoap}>
                                        Edit
                                    </Button>
                                    <Button size="sm" variant="secondary" onClick={onGenerateSoap} loading={generatingSoap} disabled={generatingSoap}>
                                        Regenerate
                                    </Button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {soap ? (
                    <SoapNoteViewer
                        soap={isEditing ? editedSoap : soap}
                        isEditing={isEditing}
                        onEditChange={handleFieldChange}
                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                        <div>
                            <p className="text-sm font-medium text-slate-500">
                                {generatingSoap ? "Generating SOAP note…" : "No SOAP note yet."}
                            </p>
                            {!generatingSoap && (
                                <p className="text-xs text-slate-400 mt-1">Generate one from the transcript on the left.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
