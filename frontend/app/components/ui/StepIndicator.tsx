import React from "react";

interface Step {
    name: string;
    description?: string;
}

interface StepIndicatorProps {
    steps: Step[];
    currentStep: number;
}

export default function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
    return (
        <div className="mb-8">
            <div className="flex items-center justify-between">
                {steps.map((step, index) => {
                    const isCompleted = index < currentStep;
                    const isCurrent = index === currentStep;
                    const stepNumber = index + 1;

                    return (
                        <React.Fragment key={index}>
                            <div className="flex flex-col items-center flex-1">
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${isCompleted
                                            ? "bg-[var(--brand-600)] text-white"
                                            : isCurrent
                                                ? "bg-[var(--brand-100)] text-[var(--brand-700)] ring-2 ring-[var(--brand-600)]"
                                                : "bg-slate-200 text-slate-500"
                                        }`}
                                >
                                    {isCompleted ? (
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
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
                                <div className="mt-2 text-center">
                                    <p
                                        className={`text-sm font-medium ${isCurrent ? "text-[var(--brand-700)]" : isCompleted ? "text-slate-700" : "text-slate-500"
                                            }`}
                                    >
                                        {step.name}
                                    </p>
                                    {step.description && (
                                        <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                                    )}
                                </div>
                            </div>
                            {index < steps.length - 1 && (
                                <div
                                    className={`flex-1 h-0.5 mx-2 transition-all ${isCompleted ? "bg-[var(--brand-600)]" : "bg-slate-200"
                                        }`}
                                    style={{ maxWidth: "100px" }}
                                />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}
