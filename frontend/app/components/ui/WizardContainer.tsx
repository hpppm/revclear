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
    const [stepError, setStepError] = useState<string | null>(null);
    // Track whether the current step change came from user navigation (not external sync)
    const userNavigatedRef = useRef(false);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Sync step from parent (URL restore) without triggering onStepChange
        userNavigatedRef.current = false;
        setCurrentStep(initialStep);
        setStepError(null);
    }, [initialStep]);

    useEffect(() => {
        // Scroll to top of content and window on step change
        contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        window.scrollTo({ top: 0, behavior: "smooth" });
        // Only notify parent when the user actually clicked Next/Back
        if (userNavigatedRef.current && onStepChange) {
            onStepChange(currentStep);
        }
    }, [currentStep]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleNext = async () => {
        const currentStepData = steps[currentStep];

        setIsTransitioning(true);
        setStepError(null);
        try {
            if (currentStepData.onNext) {
                await currentStepData.onNext();
            }

            if (currentStep < steps.length - 1) {
                userNavigatedRef.current = true;
                setCurrentStep(currentStep + 1);
            } else {
                onComplete();
            }
        } catch (err: any) {
            logger.error("Error in step transition", err);
            // On the last step the component handles its own field-level scroll;
            // only scroll to top for earlier steps where there is no field-level scroll.
            if (currentStep < steps.length - 1) {
                contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
            setStepError(err?.message || "Please fix the errors above before continuing.");
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
        } catch (err) {
            logger.error("Error in step transition", err);
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
        <div className="space-y-4">
            {title && (
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Encounter workflow</p>
                        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
                    </div>
                </div>
            )}

            <Card className="min-h-[520px] flex flex-col">
                    <StepIndicator
                        steps={steps.map((s) => ({ name: s.name, description: s.description }))}
                        currentStep={currentStep}
                    />

                    <div ref={contentRef} className="flex-1 overflow-auto">
                        <div className="animate-fadeIn">{currentStepData.component}</div>
                    </div>

                    {stepError && (
                        <p className="mt-4 text-sm text-red-600 text-center">{stepError}</p>
                    )}

                    <div className="flex justify-between items-center pt-6 mt-6 border-t border-slate-200">
                        {isFirstStep && onExit ? (
                            <Button variant="ghost" onClick={onExit}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                Exit
                            </Button>
                        ) : (
                            <Button variant="ghost" onClick={handleBack} disabled={!canGoBack}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                Back
                            </Button>
                        )}
                        <div className="text-sm text-slate-500">
                            Step {currentStep + 1} of {steps.length}
                        </div>
                        <Button onClick={handleNext} disabled={!canGoNext} loading={isTransitioning}>
                            {isLastStep ? "Submit" : "Continue"}
                            {!isLastStep && <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>}
                        </Button>
                    </div>
            </Card>
        </div>
    );
}
