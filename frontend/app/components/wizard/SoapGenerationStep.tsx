"use client";

import { useState, useEffect } from "react";
import Button from "../ui/Button";
import SoapNoteViewer from "../SoapNoteViewer";

interface SoapGenerationStepProps {
    transcript: any;
    soap: any;
    generatingSoap: boolean;
    onGenerateSoap: () => void;
    onGenerateMockSoap: () => void;
    onSaveSoap?: (soap: any) => Promise<void>;
}

export default function SoapGenerationStep({
    transcript,
    soap,
    generatingSoap,
    onGenerateSoap,
    onGenerateMockSoap,
    onSaveSoap,
}: SoapGenerationStepProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedSoap, setEditedSoap] = useState<any>(null);
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
        if (!onSaveSoap) return;
        setSaving(true);
        try {
            await onSaveSoap(editedSoap);
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to save SOAP note", error);
        } finally {
            setSaving(false);
        }
    };

    const handleFieldChange = (field: string, value: string) => {
        setEditedSoap((prev: any) => ({
            ...prev,
            [field]: value,
        }));
    };

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
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={onGenerateMockSoap}
                                            disabled={generatingSoap}
                                            className="bg-purple-600 text-white hover:bg-purple-700"
                                        >
                                            Generate SOAP (Mock)
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
