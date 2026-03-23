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
                <div className="glass-card rounded-xl p-8">
                    <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="h-10 animate-shimmer rounded" />
                        ))}
                    </div>
                </div>
            ) : error ? (
                <div className="rounded-xl p-6" style={{ background: 'var(--rc-rose-glow)', border: '1px solid rgba(244, 63, 94, 0.2)', color: 'var(--rc-rose)' }}>
                    {error}
                </div>
            ) : claims.length === 0 ? (
                <div className="glass-card rounded-xl p-12 text-center animate-revealUp">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'var(--rc-elevated)', color: 'var(--rc-text-muted)' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                        </svg>
                    </div>
                    <p className="text-sm font-medium" style={{ color: 'var(--rc-text-secondary)' }}>No claims yet</p>
                    <p className="text-xs mt-1 font-mono" style={{ color: 'var(--rc-text-faint)' }}>Claims are generated automatically from completed encounters.</p>
                    <Link
                        href="/dashboard/encounters/create"
                        className="brand-button-primary mt-6 rounded-lg px-4 py-2 text-sm font-semibold transition"
                    >
                        Start an encounter
                    </Link>
                </div>
            ) : (
                <div className="glass-card rounded-xl overflow-hidden animate-revealUp">
                    {/* Summary bar */}
                    <div className="flex items-center gap-6 px-6 py-3" style={{ borderBottom: '1px solid var(--rc-border)' }}>
                        <span className="text-xs font-mono" style={{ color: 'var(--rc-text-muted)' }}>
                            {claims.length} claim{claims.length !== 1 ? "s" : ""} total
                        </span>
                        <span className="text-xs font-mono">
                            <span className="font-semibold" style={{ color: 'var(--rc-amber)' }}>
                                {claims.filter(c => ["pending", "submitted", "draft"].includes(c.status?.toLowerCase())).length}
                            </span>
                            <span className="ml-1" style={{ color: 'var(--rc-text-faint)' }}>pending</span>
                        </span>
                        <span className="text-xs font-mono">
                            <span className="font-semibold" style={{ color: 'var(--rc-teal)' }}>
                                {claims.filter(c => ["approved", "paid"].includes(c.status?.toLowerCase())).length}
                            </span>
                            <span className="ml-1" style={{ color: 'var(--rc-text-faint)' }}>approved</span>
                        </span>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-[11px] font-mono font-medium uppercase tracking-widest" style={{ color: 'var(--rc-text-faint)', borderBottom: '1px solid var(--rc-border)' }}>
                                    <th className="px-6 py-3 text-left">Claim ID</th>
                                    <th className="px-6 py-3 text-left">Service Date</th>
                                    <th className="px-6 py-3 text-left">Payer</th>
                                    <th className="px-6 py-3 text-left">Type</th>
                                    <th className="px-6 py-3 text-left">Amount</th>
                                    <th className="px-6 py-3 text-left">Status</th>
                                    <th className="px-6 py-3 text-left">Submitted</th>
                                </tr>
                            </thead>
                            <tbody>
                                {claims.map((claim, idx) => (
                                    <tr
                                        key={claim.id}
                                        className="transition-colors table-row-animate"
                                        style={{
                                            borderBottom: '1px solid var(--rc-border)',
                                            animationDelay: `${idx * 30}ms`,
                                        }}
                                    >
                                        <td className="px-6 py-3.5">
                                            <Link
                                                href={`/dashboard/encounters/${claim.encounter_id}`}
                                                className="font-mono text-xs font-medium"
                                                style={{ color: 'var(--rc-teal)' }}
                                            >
                                                {claim.id.slice(0, 8).toUpperCase()}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-3.5 font-mono text-xs" style={{ color: 'var(--rc-text-secondary)' }}>
                                            {formatDate(claim.service_date_start)}
                                            {claim.service_date_end && claim.service_date_end !== claim.service_date_start && (
                                                <span style={{ color: 'var(--rc-text-faint)' }}> – {formatDate(claim.service_date_end)}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3.5" style={{ color: 'var(--rc-text-primary)' }}>
                                            {claim.payer_name || claim.insurance_provider || "—"}
                                        </td>
                                        <td className="px-6 py-3.5 font-mono text-xs capitalize" style={{ color: 'var(--rc-text-muted)' }}>
                                            {claim.claim_type || "—"}
                                        </td>
                                        <td className="px-6 py-3.5 font-mono font-medium" style={{ color: 'var(--rc-text-primary)' }}>
                                            {formatCurrency(claim.total_amount)}
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <Badge variant={statusBadgeVariant(claim.status)} size="sm">
                                                {claim.status || "unknown"}
                                            </Badge>
                                            {claim.rejection_reason && (
                                                <p className="text-xs mt-1 max-w-[180px] truncate" style={{ color: 'var(--rc-rose)' }} title={claim.rejection_reason}>
                                                    {claim.rejection_reason}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-6 py-3.5 font-mono text-xs" style={{ color: 'var(--rc-text-muted)' }}>
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
