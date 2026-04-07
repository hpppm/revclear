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
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm md:px-6">
            <div className="flex w-full items-center gap-2 md:gap-3">
                {steps.map((step, index) => {
                    const isCompleted = index < currentStep;
                    const isCurrent = index === currentStep;
                    const stepNumber = index + 1;

                    return (
                        <React.Fragment key={index}>
                            <div className="flex min-w-0 items-center gap-2 md:gap-3">
                                <div
                                    className={`h-8 w-8 md:h-11 md:w-11 shrink-0 rounded-full flex items-center justify-center font-semibold text-base leading-none transition-all ${
                                        isCompleted
                                            ? "bg-(--brand-500) text-white"
                                            : isCurrent
                                              ? "bg-white text-(--brand-600) ring-2 ring-(--brand-600)"
                                              : "bg-slate-100 text-slate-500"
                                    }`}
                                >
                                    {isCompleted ? (
                                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                            <path
                                                fillRule="evenodd"
                                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    ) : (
                                        stepNumber
                                    )}
                                </div>

                                <p
                                    className={`truncate text-[15px]  leading-none transition-colors ${
                                        isCompleted || isCurrent ? "text-(--brand-600)" : "text-slate-500"
                                    }`}
                                >
                                    {getCompactStepLabel(step.name)}
                                </p>
                            </div>

                            {index < steps.length - 1 && (
                                <div
                                    className={`h-0.5 min-w-4 flex-1 transition-colors ${
                                        isCompleted ? "bg-(--brand-500)" : "bg-slate-200"
                                    }`}
                                />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}
