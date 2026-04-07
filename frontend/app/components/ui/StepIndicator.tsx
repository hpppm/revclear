import React from "react";

interface Step {
    name: string;
    description?: string;
}

function getCompactStepLabel(name: string): string {
    switch (name) {
        case "Patient Details":
            return "Patient";
        case "SOAP Note":
            return "SOAP";
        case "Medical Codes":
            return "Codes";
        case "Review Claim":
            return "Review";
        default:
            return name;
    }
}

interface StepIndicatorProps {
    steps: Step[];
    currentStep: number;
}

export default function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
    return (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm md:px-6">
            <div className="overflow-x-auto">
                <ol className="flex min-w-max items-stretch">
                    {steps.map((step, index) => {
                        const isCompleted = index < currentStep;
                        const isCurrent = index === currentStep;
                        const label = getCompactStepLabel(step.name);

                        return (
                            <li key={index} className="relative">
                                <div
                                    className={`relative flex h-12 min-w-[235px] items-center justify-center px-8 text-sm font-semibold transition-colors  ${
                                        isCompleted
                                            ? "bg-(--brand-500) text-white"
                                            : isCurrent
                                              ? "bg-(--brand-200) text-(--brand-700)"
                                              : "bg-slate-100 text-slate-500"
                                    } ${index === 0 ? "rounded-l-lg" : ""} ${index === steps.length - 1 ? "rounded-r-lg" : ""}`}
                                >
                                    <span className="truncate">{label}</span>

                                    {index < steps.length - 1 && (
                                        <>
                                            <span
                                                className={`pointer-events-none absolute -right-6 top-0 z-20 h-0 w-0 border-y-[24px] border-l-[24px] border-y-transparent ${
                                                    isCompleted
                                                        ? "border-l-(--brand-500)"
                                                        : isCurrent
                                                          ? "border-l-(--brand-200)"
                                                          : "border-l-slate-100"
                                                }`}
                                            />
                                            <span
                                                aria-hidden="true"
                                                className="pointer-events-none absolute -right-7 top-0 z-10 h-0 w-0 border-y-[24px] border-l-[24px] border-y-transparent border-l-white"
                                            />
                                        </>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ol>
            </div>
        </div>
    );
}
