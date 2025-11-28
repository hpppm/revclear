"use client";

import Button from "../ui/Button";
import SoapNoteViewer from "../SoapNoteViewer";
import MedicalCodesViewer from "../MedicalCodesViewer";

interface ReviewStepProps {
    encounterId: string | null;
    transcript: any;
    soap: any;
    generatingSoap: boolean;
    onGenerateSoap: () => void;
    onGenerateMockSoap: () => void;
}

export default function ReviewStep({
    encounterId,
    transcript,
    soap,
    generatingSoap,
    onGenerateSoap,
    onGenerateMockSoap,
}: ReviewStepProps) {
    const transcriptText =
        typeof transcript === "string"
            ? transcript
            : transcript?.text ||
            transcript?.summary ||
            JSON.stringify(transcript ?? {}, null, 2);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold text-slate-900 mb-2">
                    Review & SOAP Note
                </h2>
                <p className="text-slate-600">
                    Review the transcript and generate a SOAP note.
                </p>
            </div>

            <div className="space-y-4">
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-slate-700">Transcript</p>
                        {transcriptText && !soap && (
                            <div className="flex gap-2">
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
                            </div>
                        )}
                    </div>
                    {transcriptText ? (
                        <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-800 max-h-64 overflow-auto">
                            {transcriptText}
                        </pre>
                    ) : (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                            No transcript available yet.
                        </div>
                    )}
                </div>

                <div>
                    <p className="text-sm font-medium text-slate-700 mb-2">SOAP Note</p>
                    {soap ? (
                        <SoapNoteViewer soap={soap} />
                    ) : (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                            {generatingSoap
                                ? "Generating SOAP note..."
                                : "No SOAP note generated yet. Generate one from the transcript above."}
                        </div>
                    )}
                </div>

                {soap && encounterId && (
                    <div>
                        <p className="text-sm font-medium text-slate-700 mb-2">Medical Codes</p>
                        <MedicalCodesViewer soap={soap} encounterId={encounterId} />
                    </div>
                )}
            </div>
        </div>
    );
}
