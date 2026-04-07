"use client";

import { MedicalCode } from "@/app/lib/types";
import MedicalCodesViewer from "../MedicalCodesViewer";

interface MedicalCodesStepProps {
    encounterId: string | null;
    soap: any;
    savedCodes?: MedicalCode[];
    selectedCodes?: MedicalCode[];
    onSelectionChange?: (codes: MedicalCode[]) => void;
}

export default function MedicalCodesStep({
    encounterId,
    soap,
    savedCodes,
    selectedCodes = [],
    onSelectionChange,
}: MedicalCodesStepProps) {
    const hasICD = selectedCodes.some((c) => c.type === "ICD-10");
    const hasCPT = selectedCodes.some((c) => c.type === "CPT");

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold text-slate-900 mb-2">
                    Medical Codes
                </h2>
                <p className="text-slate-600">
                    Generate and select ICD-10 and CPT codes for billing.
                </p>
                {(!hasICD || !hasCPT) && (
                    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
                        At least one <strong>ICD-10</strong> and one <strong>CPT</strong> code must be selected before continuing.
                        {hasICD && !hasCPT && " (Missing: CPT code)"}
                        {!hasICD && hasCPT && " (Missing: ICD-10 code)"}
                    </div>
                )}
            </div>

            {soap && encounterId ? (
                <MedicalCodesViewer
                    soap={soap}
                    encounterId={encounterId}
                    savedCodes={savedCodes}
                    onCodesSelected={onSelectionChange}
                />
            ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    SOAP note is required to generate medical codes.
                </div>
            )}
        </div>
    );
}
