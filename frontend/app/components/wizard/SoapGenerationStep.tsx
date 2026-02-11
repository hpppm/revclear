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
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold text-slate-900 mb-2">
                    SOAP Note Generation
                </h2>
                <p className="text-slate-600">
                    Review the transcript and generate a SOAP note.
                </p>
            </div>

            <div className="space-y-4">
                <div>
                    <p className="text-sm font-medium text-slate-700 mb-2">Transcript</p>
                    {transcriptText ? (
                        <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-800 max-h-64 overflow-auto">
                            {transcriptText}
                        </pre>
                    ) : (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                            No transcript available.
                        </div>
                    )}
                </div>

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-slate-700">SOAP Note</p>
                        {transcriptText && (
                            <div className="flex gap-2">
                                {!soap ? (
                                    <>
                                        <Button
                                            size="sm"
                                            onClick={onGenerateSoap}
                                            loading={generatingSoap}
                                            disabled={generatingSoap}
                                        >
                                            Generate SOAP
                                        </Button>
                                    </>
                                ) : isEditing ? (
                                    <>
                                        <Button
                                            size="sm"
                                            onClick={handleSave}
                                            loading={saving}
                                            disabled={saving}
                                        >
                                            Save Changes
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={handleCancel}
                                            disabled={saving}
                                        >
                                            Cancel
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={handleEdit}
                                            disabled={generatingSoap}
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={onGenerateSoap}
                                            loading={generatingSoap}
                                            disabled={generatingSoap}
                                        >
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
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                            {generatingSoap
                                ? "Generating SOAP note..."
                                : "No SOAP note generated yet. Generate one from the transcript above."}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
