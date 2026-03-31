"use client";

import { MedicalCode } from "@/app/lib/types";
import MedicalCodesViewer from "../MedicalCodesViewer";

interface MedicalCodesStepProps {
    encounterId: string | null;
    soap: any;
    savedCodes?: MedicalCode[];
    onSelectionChange?: (codes: MedicalCode[]) => void;
}

export default function MedicalCodesStep({
    encounterId,
    soap,
    savedCodes,
    onSelectionChange,
}: MedicalCodesStepProps) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold text-slate-900 mb-2">
                    Medical Codes
                </h2>
                <p className="text-slate-600">
                    Generate and select ICD-10 and CPT codes for billing.
                </p>
                <p className="text-xs text-slate-500 mt-1">
                    Select at least one ICD-10 or CPT code to continue.
                </p>
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
