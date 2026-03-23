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
        <div className="flex flex-col gap-0 pr-6">
            {steps.map((step, index) => {
                const isCompleted = index < currentStep;
                const isCurrent = index === currentStep;
                const stepNumber = index + 1;
                const isLast = index === steps.length - 1;

                return (
                    <div key={index} className="flex items-start gap-3">
                        {/* Vertical line + circle */}
                        <div className="flex flex-col items-center">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-semibold transition-all shrink-0 ${
                                    isCompleted
                                        ? "text-[var(--rc-deep)]"
                                        : isCurrent
                                            ? "text-[var(--rc-teal)]"
                                            : "text-[var(--rc-text-muted)]"
                                }`}
                                style={{
                                    background: isCompleted
                                        ? 'var(--rc-teal)'
                                        : isCurrent
                                            ? 'var(--rc-teal-glow)'
                                            : 'var(--rc-elevated)',
                                    border: isCurrent
                                        ? '2px solid var(--rc-teal)'
                                        : '1px solid var(--rc-border)',
                                    boxShadow: isCurrent
                                        ? '0 0 12px rgba(0, 212, 184, 0.3)'
                                        : isCompleted
                                            ? '0 0 8px rgba(0, 212, 184, 0.2)'
                                            : 'none',
                                }}
                            >
                                {isCompleted ? (
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
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
                            {/* Vertical connector line */}
                            {!isLast && (
                                <div
                                    className="w-px flex-1 min-h-[28px] transition-colors"
                                    style={{
                                        background: isCompleted
                                            ? 'var(--rc-teal)'
                                            : 'var(--rc-border)',
                                    }}
                                />
                            )}
                        </div>

                        {/* Label */}
                        <div className="pt-1 pb-4">
                            <p
                                className={`text-sm font-medium font-mono tracking-wide ${
                                    isCurrent
                                        ? "text-[var(--rc-teal)]"
                                        : isCompleted
                                            ? "text-[var(--rc-text-primary)]"
                                            : "text-[var(--rc-text-muted)]"
                                }`}
                            >
                                {step.name}
                            </p>
                            {step.description && (
                                <p className="text-xs mt-0.5" style={{ color: 'var(--rc-text-faint)' }}>
                                    {step.description}
                                </p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
