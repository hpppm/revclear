"use client";

import React, { useState, useEffect, useRef } from "react";
import logger from "@/app/lib/logger";
import Card from "./Card";
import Button from "./Button";
import StepIndicator from "./StepIndicator";

interface WizardStep {
    name: string;
    description?: string;
    component: React.ReactNode;
    canGoNext?: boolean;
    canGoBack?: boolean;
    onNext?: () => Promise<void> | void; // Called before advancing
    onBack?: () => Promise<void> | void; // Called before going back
}

interface WizardContainerProps {
    steps: WizardStep[];
    onComplete: () => void;
    title?: string;
    initialStep?: number;
    onStepChange?: (step: number) => void;
    onExit?: () => void;
}

export default function WizardContainer({
    steps,
    onComplete,
    title,
    initialStep = 0,
    onStepChange,
    onExit
}: WizardContainerProps) {
    const [currentStep, setCurrentStep] = useState(initialStep);
    const [isTransitioning, setIsTransitioning] = useState(false);
    // Track whether the current step change came from user navigation (not external sync)
    const userNavigatedRef = useRef(false);

    useEffect(() => {
        // Sync step from parent (URL restore) without triggering onStepChange
        userNavigatedRef.current = false;
        setCurrentStep(initialStep);
    }, [initialStep]);

    useEffect(() => {
        // Only notify parent when the user actually clicked Next/Back
        if (userNavigatedRef.current && onStepChange) {
            onStepChange(currentStep);
        }
    }, [currentStep]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleNext = async () => {
        const currentStepData = steps[currentStep];

        setIsTransitioning(true);
        try {
            // Call onNext callback if it exists
            if (currentStepData.onNext) {
                await currentStepData.onNext();
            }

            if (currentStep < steps.length - 1) {
                userNavigatedRef.current = true;
                setCurrentStep(currentStep + 1);
            } else {
                onComplete();
            }
        } catch {
            logger.error("Error in step transition");
        } finally {
            setIsTransitioning(false);
        }
    };

    const handleBack = async () => {
        const currentStepData = steps[currentStep];

        setIsTransitioning(true);
        try {
            // Call onBack callback if it exists
            if (currentStepData.onBack) {
                await currentStepData.onBack();
            }

            if (currentStep > 0) {
                userNavigatedRef.current = true;
                setCurrentStep(currentStep - 1);
            }
        } catch {
            logger.error("Error in step transition");
        } finally {
            setIsTransitioning(false);
        }
    };

    const currentStepData = steps[currentStep];
    const isFirstStep = currentStep === 0;
    const isLastStep = currentStep === steps.length - 1;
    const canGoNext = currentStepData.canGoNext !== false && !isTransitioning;
    const canGoBack = currentStepData.canGoBack !== false && !isFirstStep && !isTransitioning;

    return (
        <div className="min-h-screen flex items-start justify-center p-6" style={{ background: 'var(--rc-deep)' }}>
            <div className="w-full max-w-5xl">
                {title && (
                    <div className="mb-6 animate-revealUp">
                        <h1 className="text-2xl font-semibold" style={{ color: 'var(--rc-text-primary)' }}>{title}</h1>
                        <p className="text-sm font-mono mt-1" style={{ color: 'var(--rc-text-muted)' }}>
                            Step {currentStep + 1} of {steps.length}
                        </p>
                    </div>
                )}

                <div className="flex gap-8">
                    {/* Left: Vertical step rail */}
                    <div className="hidden md:block w-48 shrink-0 pt-2 animate-revealUp">
                        <StepIndicator
                            steps={steps.map((s) => ({ name: s.name, description: s.description }))}
                            currentStep={currentStep}
                        />
                    </div>

                    {/* Right: Content */}
                    <div className="flex-1 min-w-0">
                        <Card className="min-h-[500px] flex flex-col animate-revealUp stagger-1">
                            <div className="flex-1 overflow-auto">
                                <div className="animate-fadeIn">{currentStepData.component}</div>
                            </div>

                            <div
                                className="flex justify-between items-center pt-5 mt-5"
                                style={{ borderTop: '1px solid var(--rc-border)' }}
                            >
                                {isFirstStep && onExit ? (
                                    <Button variant="ghost" onClick={onExit}>
                                        ← Exit Encounter
                                    </Button>
                                ) : (
                                    <Button variant="ghost" onClick={handleBack} disabled={!canGoBack}>
                                        ← Back
                                    </Button>
                                )}
                                <span className="text-xs font-mono" style={{ color: 'var(--rc-text-faint)' }}>
                                    {currentStep + 1}/{steps.length}
                                </span>
                                <Button onClick={handleNext} disabled={!canGoNext} loading={isTransitioning}>
                                    {isLastStep ? "Ready for Submission" : "Continue →"}
                                </Button>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
