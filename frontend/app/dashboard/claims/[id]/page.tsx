"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/app/lib/api/apiClient";
import Badge from "@/app/components/ui/Badge";
import BackButton from "@/app/components/ui/BackButton";
import logger from "@/app/lib/logger";

type BadgeVariant = "success" | "warning" | "error" | "info" | "neutral";

function statusVariant(status: string): BadgeVariant {
    const s = status?.toLowerCase();
    if (["approved", "paid"].includes(s)) return "success";
    if (["pending", "submitted", "draft"].includes(s)) return "warning";
    if (["rejected", "denied"].includes(s)) return "error";
    return "neutral";
}

function formatDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatCurrency(n: number | null) {
    if (n == null) return "—";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex justify-between py-2.5 border-b border-slate-100 last:border-0">
            <span className="text-sm text-slate-500">{label}</span>
            <span className="text-sm font-medium text-slate-900 text-right max-w-[60%]">{value || "—"}</span>
        </div>
    );
}

export default function ClaimDetailPage() {
    const params = useParams();
    const claimId = params?.id as string;
    const [claim, setClaim] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const fetchedRef = useRef(false);

    useEffect(() => {
        if (!claimId || fetchedRef.current) return;
        fetchedRef.current = true;
        const load = async () => {
            try {
                const res = await apiClient.claims.getById(claimId);
                setClaim(res.data?.data || res.data);
            } catch (err) {
                logger.error("Failed to load claim", err);
                setError("Failed to load claim. Please try again.");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [claimId]);

    if (loading) {
        return (
            <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
                <div className="h-5 w-20 rounded bg-slate-200 animate-pulse" />
                <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 space-y-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex justify-between py-2.5 border-b border-slate-100">
                            <div className="h-4 w-24 rounded bg-slate-100 animate-pulse" />
                            <div className="h-4 w-32 rounded bg-slate-100 animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error || !claim) {
        return (
            <div className="max-w-3xl mx-auto px-6 py-8">
                <BackButton href="/dashboard/claims">Back to Claims</BackButton>
                <div className="mt-4 rounded-2xl bg-red-50 border border-red-100 p-6 text-red-700 text-sm">
                    {error || "Claim not found."}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
            <BackButton href="/dashboard/claims">Back to Claims</BackButton>

            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">
                        Claim <span className="font-mono text-base">{claim.id?.slice(0, 8).toUpperCase()}</span>
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Created {formatDate(claim.created_at)}
                    </p>
                </div>
                <Badge variant={statusVariant(claim.status)} size="sm">
                    {claim.status ? claim.status.charAt(0).toUpperCase() + claim.status.slice(1) : "Pending"}
                </Badge>
            </div>

            {/* Claim details */}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
                <div className="px-6 py-4 bg-slate-50">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Claim Details</p>
                </div>
                <div className="px-6 py-2">
                    <Row label="Payer" value={claim.payer_name || claim.insurance_provider} />
                    <Row label="Claim Type" value={claim.claim_type} />
                    <Row label="Submission Type" value={claim.submission_type} />
                    <Row label="Service Date" value={
                        claim.service_date_start
                            ? claim.service_date_end && claim.service_date_end !== claim.service_date_start
                                ? `${formatDate(claim.service_date_start)} – ${formatDate(claim.service_date_end)}`
                                : formatDate(claim.service_date_start)
                            : null
                    } />
                    <Row label="Submitted" value={formatDate(claim.submission_date)} />
                    <Row label="Total Billed" value={<span className="font-semibold">{formatCurrency(claim.total_amount)}</span>} />
                    <Row label="Patient Responsibility" value={formatCurrency(claim.patient_responsibility)} />
                </div>
            </div>

            {/* Diagnosis & procedure codes */}
            {(claim.diagnosis_codes?.length > 0 || claim.procedure_codes?.length > 0) && (
                <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50">
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Codes</p>
                    </div>
                    <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {claim.diagnosis_codes?.length > 0 && (
                            <div>
                                <p className="text-xs text-slate-400 font-medium mb-2">Diagnosis (ICD-10)</p>
                                <div className="flex flex-wrap gap-2">
                                    {claim.diagnosis_codes.map((code: string) => (
                                        <span key={code} className="rounded-md bg-blue-50 px-2 py-1 text-xs font-mono font-medium text-blue-700">{code}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {claim.procedure_codes?.length > 0 && (
                            <div>
                                <p className="text-xs text-slate-400 font-medium mb-2">Procedure (CPT)</p>
                                <div className="flex flex-wrap gap-2">
                                    {claim.procedure_codes.map((code: string) => (
                                        <span key={code} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-mono font-medium text-slate-700">{code}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Line items */}
            {claim.line_items?.length > 0 && (
                <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50">
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Line Items</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-xs font-medium uppercase tracking-widest text-slate-400 border-b border-slate-100">
                                    <th className="px-6 py-3 text-left">CPT</th>
                                    <th className="px-6 py-3 text-left">Modifiers</th>
                                    <th className="px-6 py-3 text-left">Units</th>
                                    <th className="px-6 py-3 text-right">Charge</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {claim.line_items.map((item: any) => (
                                    <tr key={item.line_number} className="hover:bg-slate-50">
                                        <td className="px-6 py-3 font-mono text-xs font-semibold text-slate-800">{item.procedure_code}</td>
                                        <td className="px-6 py-3 text-slate-500 text-xs">{item.modifiers?.join(", ") || "—"}</td>
                                        <td className="px-6 py-3 text-slate-600">{item.units}</td>
                                        <td className="px-6 py-3 text-right font-medium text-slate-900">{formatCurrency(item.charge_amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Rejection reason */}
            {claim.rejection_reason && (
                <div className="rounded-2xl bg-red-50 border border-red-100 p-5">
                    <p className="text-xs font-semibold uppercase tracking-widest text-red-400 mb-1">Rejection Reason</p>
                    <p className="text-sm text-red-700">{claim.rejection_reason}</p>
                </div>
            )}

            {/* Link to encounter */}
            {claim.encounter_id && (
                <div className="text-sm">
                    <Link
                        href={`/dashboard/encounters/${claim.encounter_id}`}
                        className="text-(--brand-600) hover:text-(--brand-700) font-medium hover:underline"
                    >
                        View linked encounter
                    </Link>
                </div>
            )}
        </div>
    );
}
