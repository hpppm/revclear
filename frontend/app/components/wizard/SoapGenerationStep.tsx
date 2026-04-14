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
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.4fr] gap-5 items-start">
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">Transcript</h3>
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
                <div className="p-4 max-h-[560px] overflow-auto">
                    {transcriptText ? (
                        <pre className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed font-sans">
                            {String(transcriptText ?? "")}
                        </pre>
                    ) : (
                        <p className="text-sm text-slate-400 italic">No transcript available.</p>
                    )}
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-900">SOAP Note</h3>
                    {soap && (
                        <div className="flex gap-2 flex-wrap justify-end">
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

                <div className="p-4">
                    {soap ? (
                        <SoapNoteViewer
                            soap={isEditing ? editedSoap : soap}
                            isEditing={isEditing}
                            onEditChange={handleFieldChange}
                        />
                    ) : (
                        <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                            <div>
                                <p className="text-sm font-medium text-slate-500">
                                    {generatingSoap ? "Generating SOAP note..." : "No SOAP note yet."}
                                </p>
                                {!generatingSoap && (
                                    <p className="text-xs text-slate-400 mt-1">Generate from transcript to continue.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
