"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/app/lib/api/apiClient";
import logger from "@/app/lib/logger";
import DashboardHeader from "@/app/components/ui/DashboardHeader";
import Badge from "@/app/components/ui/Badge";

type Claim = {
    id: string;
    encounter_id: string;
    patient_id: string;
    status: string;
    total_amount: number | null;
    insurance_provider: string | null;
    payer_name: string | null;
    claim_type: string | null;
    service_date_start: string | null;
    service_date_end: string | null;
    submission_date: string | null;
    rejection_reason: string | null;
    created_at: string;
};

function statusBadgeVariant(status: string): "success" | "warning" | "error" | "info" | "neutral" {
    const s = status?.toLowerCase();
    if (["approved", "paid"].includes(s)) return "success";
    if (["pending", "submitted", "draft"].includes(s)) return "warning";
    if (["rejected", "denied"].includes(s)) return "error";
    return "neutral";
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatCurrency(amount: number | null) {
    if (amount == null) return "—";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export default function ClaimsPage() {
    const [claims, setClaims] = useState<Claim[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadClaims = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await apiClient.claims.getAll();
                const raw: Claim[] = response.data?.data || [];
                setClaims(raw);
            } catch (err) {
                logger.error("Failed to fetch claims", err);
                setError("Failed to load claims. Please try again.");
            } finally {
                setLoading(false);
            }
        };
        loadClaims();
    }, []);

    return (
        <div className="max-w-6xl mx-auto px-6 py-8">
            <DashboardHeader
                title="Claims"
                subtitle="Track billing claims and their submission status."
            />

            {loading ? (
                <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8 text-center text-slate-500">
                    Loading claims...
                </div>
            ) : error ? (
                <div className="rounded-2xl bg-red-50 border border-red-100 p-6 text-red-700">
                    {error}
                </div>
            ) : claims.length === 0 ? (
                <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-12 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                        </svg>
                    </div>
                    <p className="text-sm font-medium text-slate-700">No claims yet</p>
                    <p className="text-xs text-slate-400 mt-1">Claims are generated automatically from completed encounters.</p>
                    <Link
                        href="/dashboard/encounters/create"
                        className="brand-button-primary mt-6 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition"
                    >
                        Start an encounter
                    </Link>
                </div>
            ) : (
                <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                    {/* Summary bar */}
                    <div className="flex items-center gap-6 px-6 py-4 border-b border-slate-100 bg-slate-50">
                        <span className="text-sm text-slate-500">{claims.length} claim{claims.length !== 1 ? "s" : ""} total</span>
                        <span className="text-sm">
                            <span className="font-semibold text-amber-600">
                                {claims.filter(c => ["pending", "submitted", "draft"].includes(c.status?.toLowerCase())).length}
                            </span>
                            <span className="text-slate-400 ml-1">pending</span>
                        </span>
                        <span className="text-sm">
                            <span className="font-semibold text-emerald-600">
                                {claims.filter(c => ["approved", "paid"].includes(c.status?.toLowerCase())).length}
                            </span>
                            <span className="text-slate-400 ml-1">approved</span>
                        </span>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-xs font-medium uppercase tracking-widest text-slate-400 border-b border-slate-100">
                                    <th className="px-6 py-3 text-left">Claim ID</th>
                                    <th className="px-6 py-3 text-left">Service Date</th>
                                    <th className="px-6 py-3 text-left">Payer</th>
                                    <th className="px-6 py-3 text-left">Type</th>
                                    <th className="px-6 py-3 text-left">Amount</th>
                                    <th className="px-6 py-3 text-left">Status</th>
                                    <th className="px-6 py-3 text-left">Submitted</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {claims.map((claim) => (
                                    <tr key={claim.id} className="hover:bg-slate-50 transition">
                                        <td className="px-6 py-4">
                                            <Link
                                                href={`/dashboard/encounters/${claim.encounter_id}`}
                                                className="font-mono text-xs text-[var(--brand-600)] hover:text-[var(--brand-700)] hover:underline"
                                            >
                                                {claim.id.slice(0, 8).toUpperCase()}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {formatDate(claim.service_date_start)}
                                            {claim.service_date_end && claim.service_date_end !== claim.service_date_start && (
                                                <span className="text-slate-400"> – {formatDate(claim.service_date_end)}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-slate-700">
                                            {claim.payer_name || claim.insurance_provider || "—"}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 capitalize">
                                            {claim.claim_type || "—"}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-900">
                                            {formatCurrency(claim.total_amount)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={statusBadgeVariant(claim.status)} size="sm">
                                                {claim.status || "unknown"}
                                            </Badge>
                                            {claim.rejection_reason && (
                                                <p className="text-xs text-red-500 mt-1 max-w-[180px] truncate" title={claim.rejection_reason}>
                                                    {claim.rejection_reason}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {formatDate(claim.submission_date)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
