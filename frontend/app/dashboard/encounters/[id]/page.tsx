"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/app/lib/api/apiClient";
import logger from "@/app/lib/logger";
import BackButton from "@/app/components/ui/BackButton";
import Card from "@/app/components/ui/Card";
import Button from "@/app/components/ui/Button";

export default function EncounterSummaryPage() {
    const params = useParams();
    const router = useRouter();
    const encounterId = params?.id as string;

    const [encounter, setEncounter] = useState<any>(null);
    const [claim, setClaim] = useState<any>(null);
    const [transcript, setTranscript] = useState<string>("");
    const [soap, setSoap] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showAnimation, setShowAnimation] = useState(false);

    // Collapsible state
    const [transcriptExpanded, setTranscriptExpanded] = useState(false);
    const [soapExpanded, setSoapExpanded] = useState(false);
    const [claimExpanded, setClaimExpanded] = useState(false);

    useEffect(() => {
        if (encounterId) {
            fetchEncounterData();
        }
    }, [encounterId]);

    const fetchEncounterData = async () => {
        setLoading(true);
        try {
            // Fetch encounter
            const encounterRes = await apiClient.encounters.getById(encounterId);
            const encounterData = encounterRes.data?.data || encounterRes.data;
            logger.log("Encounter loaded");
            setEncounter(encounterData);

            // Fetch claim
            try {
                const claimRes = await apiClient.encounters.previewClaim(encounterId);
                const claimData = claimRes.data?.data || claimRes.data;
                logger.log("Claim loaded");
                setClaim(claimData);
            } catch (err) {
                logger.log("No claim found");
            }

            // Fetch transcript if available
            if (encounterData.transcript_result_id) {
                try {
                    const transcriptRes = await apiClient.transcribe.getByEncounterId(encounterId);
                    const transcriptData = transcriptRes.data?.text || transcriptRes.data?.data?.text || "";
                    logger.log("Transcript loaded");
                    setTranscript(transcriptData);
                } catch (err) {
                    logger.log("Failed to load transcript");
                }
            }

            // Fetch SOAP if available
            if (encounterData.soap_result_id) {
                try {
                    const soapRes = await apiClient.soap.getForEncounter(encounterId);
                    const soapData = soapRes.data?.data || soapRes.data;
                    logger.log("SOAP loaded");
                    setSoap(soapData?.soap || soapData);
                } catch (err) {
                    logger.log("Failed to load SOAP");
                }
            }
        } catch (err) {
            logger.error("Failed to load encounter data");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            // If a claim exists, mark it as submitted
            if (claim?.id) {
                await apiClient.claims.update(claim.id, {
                    status: "submitted",
                    submission_date: new Date().toISOString(),
                });
            }

            // Update encounter status to completed
            await apiClient.encounters.update(encounterId, { status: "completed" });

            // Show animation
            setShowAnimation(true);

            // Wait 3 seconds, then navigate back to patient page
            setTimeout(() => {
                router.push(`/dashboard/patients/${encounter.patient_id}`);
            }, 3000);
        } catch (err) {
            logger.error("Failed to submit claim");
            setSubmitting(false);
        }
    };

    if (showAnimation) {
        return (
            <div className="fixed inset-0 bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center z-50">
                <div className="text-center">
                    {/* Arrow animation */}
                    <div className="mb-8 flex justify-center">
                        <div className="animate-bounce-horizontal">
                            <svg className="w-24 h-24 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </div>
                    </div>

                    {/* Typewriter text */}
                    <h1 className="text-4xl font-bold text-white typewriter">
                        Sending to ClearingHouse for review
                    </h1>
                </div>

                <style jsx>{`
          @keyframes bounce-horizontal {
            0%, 100% {
              transform: translateX(0);
            }
            50% {
              transform: translateX(30px);
            }
          }

          .animate-bounce-horizontal {
            animation: bounce-horizontal 1s ease-in-out infinite;
          }

          @keyframes typewriter {
            from {
              width: 0;
            }
            to {
              width: 100%;
            }
          }

          .typewriter {
            overflow: hidden;
            border-right: 0.15em solid white;
            white-space: nowrap;
            margin: 0 auto;
            animation: typewriter 2s steps(40, end), blink-caret 0.75s step-end infinite;
            display: inline-block;
          }

          @keyframes blink-caret {
            from, to {
              border-color: transparent;
            }
            50% {
              border-color: white;
            }
          }
        `}</style>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="text-slate-500">Loading encounter summary...</div>
            </div>
        );
    }

    if (!encounter) {
        return (
            <div className="space-y-4">
                <div className="max-w-4xl mx-auto">
                    <p className="text-red-600">Encounter not found</p>
                    <BackButton href="/dashboard">Back to Dashboard</BackButton>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="max-w-4xl mx-auto space-y-6">
                <BackButton href={`/dashboard/patients/${encounter.patient_id}`}>
                    Back to Patient
                </BackButton>

                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Encounter Summary</h1>
                    <p className="text-slate-600 mt-1">
                        {new Date(encounter.date_of_service).toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                        })}
                    </p>
                </div>

                {/* Transcription Section */}
                <Card>
                    <button
                        onClick={() => setTranscriptExpanded(!transcriptExpanded)}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                        <h2 className="text-xl font-semibold text-slate-900">Transcription</h2>
                        <svg
                            className={`w-5 h-5 text-slate-500 transition-transform ${transcriptExpanded ? "rotate-180" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    {transcriptExpanded && (
                        <div className="px-6 pb-6 border-t border-slate-200">
                            <p className="text-slate-700 whitespace-pre-wrap mt-4">
                                {transcript || "No transcription available for this encounter. The audio may not have been transcribed yet."}
                            </p>
                        </div>
                    )}
                </Card>

                {/* SOAP Note Section */}
                <Card>
                    <button
                        onClick={() => setSoapExpanded(!soapExpanded)}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                        <h2 className="text-xl font-semibold text-slate-900">SOAP Note</h2>
                        <svg
                            className={`w-5 h-5 text-slate-500 transition-transform ${soapExpanded ? "rotate-180" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    {soapExpanded && soap && (
                        <div className="px-6 pb-6 border-t border-slate-200 space-y-4 mt-4">
                            {soap.subjective && (
                                <div>
                                    <h3 className="font-semibold text-slate-900 mb-2">Subjective</h3>
                                    <p className="text-slate-700">{soap.subjective}</p>
                                </div>
                            )}
                            {soap.objective && (
                                <div>
                                    <h3 className="font-semibold text-slate-900 mb-2">Objective</h3>
                                    <p className="text-slate-700">{soap.objective}</p>
                                </div>
                            )}
                            {soap.assessment && (
                                <div>
                                    <h3 className="font-semibold text-slate-900 mb-2">Assessment</h3>
                                    <p className="text-slate-700">{soap.assessment}</p>
                                </div>
                            )}
                            {soap.plan && (
                                <div>
                                    <h3 className="font-semibold text-slate-900 mb-2">Plan</h3>
                                    <p className="text-slate-700">{soap.plan}</p>
                                </div>
                            )}
                        </div>
                    )}
                    {soapExpanded && !soap && (
                        <div className="px-6 pb-6 border-t border-slate-200 mt-4">
                            <p className="text-slate-500">No SOAP note has been generated for this encounter yet.</p>
                        </div>
                    )}
                    {soapExpanded && soap && !soap.subjective && !soap.objective && !soap.assessment && !soap.plan && (
                        <div className="px-6 pb-6 border-t border-slate-200 mt-4">
                            <p className="text-slate-500">SOAP note is empty. Generate SOAP notes in the encounter workflow.</p>
                        </div>
                    )}
                </Card>

                {/* Claim Section */}
                <Card>
                    <button
                        onClick={() => setClaimExpanded(!claimExpanded)}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-semibold text-slate-900">Claim</h2>
                            {claim && (
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${encounter.status === "ready"
                                    ? "bg-green-100 text-green-800"
                                    : encounter.status === "completed"
                                        ? "bg-blue-100 text-blue-800"
                                        : "bg-gray-100 text-gray-800"
                                    }`}>
                                    {encounter.status === "ready" ? "Ready to Submit" : encounter.status?.replace("_", " ")}
                                </span>
                            )}
                        </div>
                        <svg
                            className={`w-5 h-5 text-slate-500 transition-transform ${claimExpanded ? "rotate-180" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    {claimExpanded && claim && (
                        <div className="px-6 pb-6 border-t border-slate-200 mt-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-slate-500 font-semibold mb-1">Total Amount</p>
                                    <p className="text-slate-900 font-medium">
                                        ${typeof claim.total_amount === 'number'
                                            ? claim.total_amount.toFixed(2)
                                            : parseFloat(claim.total_amount || '0').toFixed(2)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-semibold mb-1">Claim Type</p>
                                    <p className="text-slate-900 font-medium capitalize">{claim.claim_type || "Professional"}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-semibold mb-1">Diagnosis Codes</p>
                                    <p className="text-slate-900 font-medium">{claim.diagnosis_codes?.join(", ") || "—"}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-semibold mb-1">Procedure Codes</p>
                                    <p className="text-slate-900 font-medium">{claim.procedure_codes?.join(", ") || "—"}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    {claimExpanded && !claim && (
                        <div className="px-6 pb-6 border-t border-slate-200 mt-4">
                            <p className="text-slate-500">No claim generated</p>
                        </div>
                    )}
                </Card>

                {/* Submit Button */}
                {encounter.status === "ready" && (
                    <div className="flex justify-end">
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting}
                            loading={submitting}
                            className="px-8 py-3 text-lg"
                        >
                            Submit to Clearinghouse
                        </Button>
                    </div>
                )}

                {encounter.status === "completed" && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                        <p className="text-blue-800 font-medium">✓ This encounter has been submitted to the clearinghouse</p>
                    </div>
                )}
            </div>
        </div>
    );
}
