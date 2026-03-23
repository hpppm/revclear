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
    const [transcribing, setTranscribing] = useState(false);
    const [transcribeError, setTranscribeError] = useState("");
    const [showAnimation, setShowAnimation] = useState(false);

    // Collapsible state
    const [transcriptExpanded, setTranscriptExpanded] = useState(false);
    const [soapExpanded, setSoapExpanded] = useState(false);
    const [claimExpanded, setClaimExpanded] = useState(false);

    useEffect(() => {
        if (encounterId) {
            fetchEncounterData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
            } catch {
                logger.log("No claim found");
            }

            // Fetch transcript if available
            if (encounterData.transcript_result_id) {
                try {
                    const transcriptRes = await apiClient.transcribe.getByEncounterId(encounterId);
                    const transcriptData = transcriptRes.data?.text || transcriptRes.data?.data?.text || "";
                    logger.log("Transcript loaded");
                    setTranscript(transcriptData);
                } catch {
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
                } catch {
                    logger.log("Failed to load SOAP");
                }
            }
        } catch {
            logger.error("Failed to load encounter data");
        } finally {
            setLoading(false);
        }
    };

    const extractTranscriptText = (value: any) => {
        if (!value) return "";
        if (typeof value === "string") return value;
        if (typeof value.text === "string") return value.text;
        if (typeof value.transcript === "string") return value.transcript;
        return "";
    };

    const handleTranscribe = async () => {
        if (!encounterId || !encounter?.audio_key) {
            setTranscribeError("No uploaded audio is available for this encounter.");
            return;
        }

        setTranscribing(true);
        setTranscribeError("");

        try {
            const res = await apiClient.transcribe.transcribeS3({
                s3Key: encounter.audio_key,
                encounterId,
            });

            const transcriptPayload =
                res.data?.transcript || res.data?.data?.transcript || res.data;
            const nextTranscript = extractTranscriptText(transcriptPayload);

            setTranscript(nextTranscript);
            setEncounter((current: any) =>
                current
                    ? {
                        ...current,
                        transcript_result_id:
                            current.transcript_result_id || "generated",
                    }
                    : current,
            );
            setTranscriptExpanded(true);
        } catch (err) {
            logger.error("Failed to transcribe encounter audio");
            const e = err as { response?: { data?: { message?: string } } };
            setTranscribeError(
                e?.response?.data?.message || "Failed to transcribe this encounter audio.",
            );
        } finally {
            setTranscribing(false);
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
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
            <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'linear-gradient(135deg, var(--rc-deep) 0%, #0a2a3f 50%, var(--rc-deep) 100%)' }}>
                <div className="text-center">
                    {/* Arrow animation */}
                    <div className="mb-8 flex justify-center">
                        <div className="animate-bounce-horizontal">
                            <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--rc-teal)' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </div>
                    </div>

                    {/* Typewriter text */}
                    <h1 className="text-4xl font-bold typewriter" style={{ color: 'var(--rc-text-primary)' }}>
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
            border-right: 0.15em solid var(--rc-teal);
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
              border-color: var(--rc-teal);
            }
          }
        `}</style>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 mx-auto mb-4" style={{ borderBottom: '2px solid var(--rc-teal)' }}></div>
                    <p className="font-mono text-sm" style={{ color: 'var(--rc-text-muted)' }}>Loading encounter summary...</p>
                </div>
            </div>
        );
    }

    if (!encounter) {
        return (
            <div className="max-w-4xl mx-auto px-6 py-8">
                <p className="font-mono text-sm mb-4" style={{ color: 'var(--rc-rose)' }}>Encounter not found</p>
                <BackButton href="/dashboard">Back to Dashboard</BackButton>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
            <div className="animate-revealUp">
                <BackButton href={`/dashboard/patients/${encounter.patient_id}`}>
                    Back to Patient
                </BackButton>
            </div>

            <div className="animate-revealUp stagger-1">
                <h1 className="text-2xl font-semibold" style={{ color: 'var(--rc-text-primary)' }}>Encounter Summary</h1>
                <p className="font-mono text-xs mt-1" style={{ color: 'var(--rc-text-muted)' }}>
                    {new Date(encounter.date_of_service).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                    })}
                </p>
            </div>

            {/* Transcription Section */}
            <Card className="animate-revealUp stagger-2">
                <button
                    onClick={() => setTranscriptExpanded(!transcriptExpanded)}
                    className="w-full px-6 py-4 flex items-center justify-between transition-colors group"
                    style={{ borderRadius: 'inherit' }}
                >
                    <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold" style={{ color: 'var(--rc-teal-dim)' }}>01</span>
                        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--rc-text-primary)' }}>Transcription</h2>
                    </div>
                    <svg
                        className={`w-5 h-5 transition-transform ${transcriptExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        style={{ color: 'var(--rc-text-faint)' }}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                {transcriptExpanded && (
                    <div className="px-6 pb-6" style={{ borderTop: '1px solid var(--rc-border)' }}>
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                            <Button
                                onClick={handleTranscribe}
                                loading={transcribing}
                                disabled={transcribing || !encounter.audio_key}
                            >
                                {transcript ? "Retranscribe Audio" : "Transcribe Audio"}
                            </Button>
                            {!encounter.audio_key && (
                                <p className="text-xs font-mono" style={{ color: 'var(--rc-text-faint)' }}>
                                    No audio file is attached to this encounter yet.
                                </p>
                            )}
                        </div>
                        {transcribeError && (
                            <p className="mt-3 text-sm font-mono" style={{ color: 'var(--rc-rose)' }}>{transcribeError}</p>
                        )}
                        <p className="whitespace-pre-wrap mt-4 text-sm font-mono leading-relaxed" style={{ color: 'var(--rc-text-secondary)' }}>
                            {transcript || "No transcription available for this encounter. Use the button above to transcribe the attached audio."}
                        </p>
                    </div>
                )}
            </Card>

            {/* SOAP Note Section */}
            <Card className="animate-revealUp stagger-3">
                <button
                    onClick={() => setSoapExpanded(!soapExpanded)}
                    className="w-full px-6 py-4 flex items-center justify-between transition-colors group"
                    style={{ borderRadius: 'inherit' }}
                >
                    <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold" style={{ color: 'var(--rc-teal-dim)' }}>02</span>
                        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--rc-text-primary)' }}>SOAP Note</h2>
                    </div>
                    <svg
                        className={`w-5 h-5 transition-transform ${soapExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        style={{ color: 'var(--rc-text-faint)' }}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                {soapExpanded && soap && (
                    <div className="px-6 pb-6 space-y-4 mt-4" style={{ borderTop: '1px solid var(--rc-border)' }}>
                        {soap.subjective && (
                            <div className="pt-4">
                                <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--rc-teal)' }}>Subjective</h3>
                                <p className="text-sm leading-relaxed" style={{ color: 'var(--rc-text-secondary)' }}>{soap.subjective}</p>
                            </div>
                        )}
                        {soap.objective && (
                            <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--rc-teal)' }}>Objective</h3>
                                <p className="text-sm leading-relaxed" style={{ color: 'var(--rc-text-secondary)' }}>{soap.objective}</p>
                            </div>
                        )}
                        {soap.assessment && (
                            <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--rc-teal)' }}>Assessment</h3>
                                <p className="text-sm leading-relaxed" style={{ color: 'var(--rc-text-secondary)' }}>{soap.assessment}</p>
                            </div>
                        )}
                        {soap.plan && (
                            <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--rc-teal)' }}>Plan</h3>
                                <p className="text-sm leading-relaxed" style={{ color: 'var(--rc-text-secondary)' }}>{soap.plan}</p>
                            </div>
                        )}
                    </div>
                )}
                {soapExpanded && !soap && (
                    <div className="px-6 pb-6 mt-4" style={{ borderTop: '1px solid var(--rc-border)' }}>
                        <p className="text-sm font-mono pt-4" style={{ color: 'var(--rc-text-faint)' }}>No SOAP note has been generated for this encounter yet.</p>
                    </div>
                )}
                {soapExpanded && soap && !soap.subjective && !soap.objective && !soap.assessment && !soap.plan && (
                    <div className="px-6 pb-6 mt-4" style={{ borderTop: '1px solid var(--rc-border)' }}>
                        <p className="text-sm font-mono pt-4" style={{ color: 'var(--rc-text-faint)' }}>SOAP note is empty. Generate SOAP notes in the encounter workflow.</p>
                    </div>
                )}
            </Card>

            {/* Claim Section */}
            <Card>
                <button
                    onClick={() => setClaimExpanded(!claimExpanded)}
                    className="w-full px-6 py-4 flex items-center justify-between transition-colors"
                    style={{ borderRadius: 'inherit' }}
                >
                    <div className="flex items-center gap-3">
                        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--rc-text-primary)' }}>Claim</h2>
                        {claim && (
                            <span
                                className="px-2 py-0.5 text-xs font-mono font-medium rounded-full"
                                style={
                                    encounter.status === "ready"
                                        ? { background: 'var(--rc-teal-glow)', color: 'var(--rc-teal)', border: '1px solid rgba(0, 212, 184, 0.2)' }
                                        : encounter.status === "completed"
                                            ? { background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)' }
                                            : { background: 'var(--rc-surface)', color: 'var(--rc-text-muted)', border: '1px solid var(--rc-border)' }
                                }
                            >
                                {encounter.status === "ready" ? "Ready to Submit" : encounter.status?.replace("_", " ")}
                            </span>
                        )}
                    </div>
                    <svg
                        className={`w-5 h-5 transition-transform ${claimExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        style={{ color: 'var(--rc-text-faint)' }}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                {claimExpanded && claim && (
                    <div className="px-6 pb-6 mt-4 space-y-4" style={{ borderTop: '1px solid var(--rc-border)' }}>
                        <div className="grid grid-cols-2 gap-4 pt-4">
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--rc-text-muted)' }}>Total Amount</p>
                                <p className="font-mono text-sm font-medium" style={{ color: 'var(--rc-text-primary)' }}>
                                    ${typeof claim.total_amount === 'number'
                                        ? claim.total_amount.toFixed(2)
                                        : parseFloat(claim.total_amount || '0').toFixed(2)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--rc-text-muted)' }}>Claim Type</p>
                                <p className="font-mono text-sm capitalize" style={{ color: 'var(--rc-text-primary)' }}>{claim.claim_type || "Professional"}</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--rc-text-muted)' }}>Diagnosis Codes</p>
                                <p className="font-mono text-sm" style={{ color: 'var(--rc-teal)' }}>{claim.diagnosis_codes?.join(", ") || "—"}</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--rc-text-muted)' }}>Procedure Codes</p>
                                <p className="font-mono text-sm" style={{ color: 'var(--rc-teal)' }}>{claim.procedure_codes?.join(", ") || "—"}</p>
                            </div>
                        </div>
                    </div>
                )}
                {claimExpanded && !claim && (
                    <div className="px-6 pb-6 mt-4" style={{ borderTop: '1px solid var(--rc-border)' }}>
                        <p className="text-sm font-mono pt-4" style={{ color: 'var(--rc-text-faint)' }}>No claim generated</p>
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
                <div className="rounded-lg p-4 text-center" style={{ background: 'var(--rc-teal-glow)', border: '1px solid rgba(0, 212, 184, 0.2)' }}>
                    <p className="font-mono text-sm font-medium" style={{ color: 'var(--rc-teal)' }}>This encounter has been submitted to the clearinghouse</p>
                </div>
            )}
        </div>
    );
}
