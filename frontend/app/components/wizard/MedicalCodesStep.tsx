"use client";

import { MedicalCode } from "@/app/lib/types";
import MedicalCodesViewer from "../MedicalCodesViewer";

interface MedicalCodesStepProps {
    encounterId: string | null;
    soap: Record<string, unknown> | null;
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
            {soap && encounterId ? (
                <MedicalCodesViewer
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
