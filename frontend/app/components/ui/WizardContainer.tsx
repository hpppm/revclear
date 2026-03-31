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
    const contentRef = useRef<HTMLDivElement | null>(null);
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

    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.scrollTo({ top: 0, behavior: "smooth" });
        }
    }, [currentStep]);

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
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl">
                {title && (
                    <div className="text-center mb-6">
                        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
                    </div>
                )}

                <Card className="min-h-[600px] flex flex-col">
                    <StepIndicator
                        steps={steps.map((s) => ({ name: s.name, description: s.description }))}
                        currentStep={currentStep}
                    />

                    <div ref={contentRef} className="flex-1 overflow-auto">
                        <div className="animate-fadeIn">{currentStepData.component}</div>
                    </div>

                    <div className="flex justify-between items-center pt-6 mt-6 border-t border-slate-200">
                        {isFirstStep && onExit ? (
                            <Button variant="ghost" onClick={onExit}>
                                ← Exit Encounter
                            </Button>
                        ) : (
                            <Button variant="ghost" onClick={handleBack} disabled={!canGoBack}>
                                ← Back
                            </Button>
                        )}
                        <div className="text-sm text-slate-500">
                            Step {currentStep + 1} of {steps.length}
                        </div>
                        <Button onClick={handleNext} disabled={!canGoNext} loading={isTransitioning}>
                            {isLastStep ? "Ready for Submission" : "Continue →"}
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
}
