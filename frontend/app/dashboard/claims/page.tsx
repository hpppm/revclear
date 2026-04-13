"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/app/lib/api/apiClient";
import { useAuthorization } from "@/app/context/AuthContext";
import logger from "@/app/lib/logger";
import DashboardHeader from "@/app/components/ui/DashboardHeader";
import Badge from "@/app/components/ui/Badge";
import UnauthorizedState from "@/app/components/ui/UnauthorizedState";

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
    date_of_service: string | null;
    submission_date: string | null;
    rejection_reason: string | null;
    created_at: string;
};

type StatusHistory = {
    id: string;
    claim_id: string;
    status: string;
    reason: string | null;
    changed_at: string;
};

function statusBadgeVariant(status: string): "success" | "warning" | "error" | "info" | "neutral" {
    const s = status?.toLowerCase();
    if (["approved", "paid", "accepted"].includes(s)) return "success";
    if (["pending", "submitted", "draft"].includes(s)) return "warning";
    if (["rejected", "denied"].includes(s)) return "error";
    return "neutral";
}


function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(dateStr: string | null) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatCurrency(amount: number | null) {
    if (amount == null) return "—";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export default function ClaimsPage() {
    const { canManageClaims } = useAuthorization();
    const [claims, setClaims] = useState<Claim[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"all" | "denials">("all");
    const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
    const [statusHistories, setStatusHistories] = useState<Record<string, StatusHistory[]>>({});
    const [loadingHistory, setLoadingHistory] = useState<string | null>(null);

    useEffect(() => {
        if (!canManageClaims) {
            setLoading(false);
            return;
        }
        loadClaims();
    }, [canManageClaims]);

    if (!canManageClaims) {
        return (
            <div className="max-w-6xl mx-auto px-6 py-8">
                <UnauthorizedState message="Your role does not have access to claims workflows." />
            </div>
        );
    }

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

    const handleDownload = async (claimId: string) => {
        try {
            const response = await apiClient.claims.download(claimId);
            const blob = new Blob([response.data], { type: "application/octet-stream" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `claim_${claimId.slice(0, 8)}.edi`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            logger.error("Failed to download EDI file", err);
        }
    };

    const toggleHistory = async (claimId: string) => {
        if (expandedHistory === claimId) {
            setExpandedHistory(null);
            return;
        }
        setExpandedHistory(claimId);
        if (!statusHistories[claimId]) {
            setLoadingHistory(claimId);
            try {
                const response = await apiClient.claims.getStatusHistory(claimId);
                setStatusHistories((prev) => ({ ...prev, [claimId]: response.data?.data || [] }));
            } catch (err) {
                logger.error("Failed to fetch status history", err);
            } finally {
                setLoadingHistory(null);
            }
        }
    };

    const deniedClaims = claims.filter((c) => ["denied", "rejected"].includes(c.status?.toLowerCase()));
    const displayedClaims = activeTab === "denials" ? deniedClaims : claims;

    const tabs = [
        { key: "all", label: "All Claims", count: claims.length },
        { key: "denials", label: "Denials", count: deniedClaims.length },
    ];

    return (
        <div className="max-w-6xl mx-auto px-6 py-8">
            <DashboardHeader
                title="Claims"
                subtitle="Track billing claims and their submission status."
            />

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-slate-200">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as "all" | "denials")}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === tab.key
                                ? "border-teal-600 text-teal-700"
                                : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                    >
                        {tab.label}
                        {tab.count > 0 && (
                            <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
                                tab.key === "denials" && tab.count > 0
                                    ? "bg-red-100 text-red-700"
                                    : "bg-slate-100 text-slate-600"
                            }`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                        <div className="h-4 w-40 rounded bg-slate-200 animate-pulse" />
                    </div>
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex gap-6 px-6 py-4 border-b border-slate-100">
                            <div className="h-4 w-20 rounded bg-slate-100 animate-pulse" />
                            <div className="h-4 w-24 rounded bg-slate-100 animate-pulse" />
                            <div className="h-4 w-28 rounded bg-slate-100 animate-pulse" />
                            <div className="h-4 w-16 rounded bg-slate-100 animate-pulse ml-auto" />
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div className="rounded-2xl bg-red-50 border border-red-100 p-6 text-red-700">
                    {error}
                </div>
            ) : displayedClaims.length === 0 ? (
                <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-12 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                        </svg>
                    </div>
                    <p className="text-sm font-medium text-slate-700">
                        {activeTab === "denials" ? "No denied claims" : "No claims yet"}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                        {activeTab === "denials"
                            ? "Denied claims with reasons will appear here."
                            : "Claims are generated automatically from completed encounters."}
                    </p>
                    {activeTab === "all" && (
                        <div className="flex justify-center gap-4 mt-6">
                            <Link
                                href="/dashboard/patients"
                                className="bg-white border text-slate-700 hover:bg-slate-50 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition"
                            >
                                Go to Patients
                            </Link>
                            <Link
                                href="/dashboard/encounters/create"
                                className="brand-button-primary rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition"
                            >
                                Start an encounter
                            </Link>
                        </div>
                    )}
                </div>
            ) : (
                <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                    {/* Summary bar */}
                    <div className="flex items-center gap-6 px-6 py-4 border-b border-slate-100 bg-slate-50">
                        <span className="text-sm text-slate-500">{displayedClaims.length} claim{displayedClaims.length !== 1 ? "s" : ""}</span>
                        {activeTab === "all" && (
                            <>
                                <span className="text-sm">
                                    <span className="font-semibold text-amber-600">
                                        {claims.filter(c => ["pending", "submitted", "draft"].includes(c.status?.toLowerCase())).length}
                                    </span>
                                    <span className="text-slate-400 ml-1">pending</span>
                                </span>
                                <span className="text-sm">
                                    <span className="font-semibold text-emerald-600">
                                        {claims.filter(c => ["approved", "paid", "accepted"].includes(c.status?.toLowerCase())).length}
                                    </span>
                                    <span className="text-slate-400 ml-1">approved</span>
                                </span>
                                <span className="text-sm">
                                    <span className="font-semibold text-red-600">
                                        {deniedClaims.length}
                                    </span>
                                    <span className="text-slate-400 ml-1">denied</span>
                                </span>
                            </>
                        )}
                        {activeTab === "denials" && (
                            <span className="text-sm text-red-600 font-medium">
                                {deniedClaims.length} claim{deniedClaims.length !== 1 ? "s" : ""} denied — review reasons below
                            </span>
                        )}
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-xs font-medium uppercase tracking-widest text-slate-400 border-b border-slate-100">
                                    <th className="px-6 py-3 text-left">Claim ID</th>
                                    <th className="px-6 py-3 text-left">Service Date</th>
                                    <th className="px-6 py-3 text-left">Payer</th>
                                    <th className="px-6 py-3 text-left">Amount</th>
                                    <th className="px-6 py-3 text-left">Status</th>
                                    {activeTab === "denials" && <th className="px-6 py-3 text-left">Denial Reason</th>}
                                    <th className="px-6 py-3 text-left">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {displayedClaims.map((claim) => (
                                    <React.Fragment key={claim.id}>
                                        <tr className="hover:bg-slate-50 transition">
                                            <td className="px-6 py-4">
                                                <Link
                                                    href={`/dashboard/encounters/${claim.encounter_id}`}
                                                    className="font-mono text-xs text-(--brand-600) hover:text-(--brand-700) hover:underline"
                                                >
                                                    {claim.id.slice(0, 8).toUpperCase()}
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {formatDate(claim.service_date_start || claim.date_of_service)}
                                                {claim.service_date_end && claim.service_date_end !== claim.service_date_start && (
                                                    <span className="text-slate-400"> – {formatDate(claim.service_date_end)}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-slate-700">
                                                {claim.payer_name || claim.insurance_provider || "—"}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-900">
                                                {formatCurrency(claim.total_amount)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant={statusBadgeVariant(claim.status)} size="sm">
                                                    {claim.status || "unknown"}
                                                </Badge>
                                                {claim.rejection_reason && (
                                                    claim.rejection_reason.toLowerCase().includes("clearinghouse not configured") ? (
                                                        <p className="text-xs text-amber-600 mt-1">
                                                            Not configured —{" "}
                                                            <Link href="/dashboard/organization" className="underline hover:text-amber-800">
                                                                Set up EDI
                                                            </Link>
                                                        </p>
                                                    ) : (
                                                        <p className="text-xs text-red-500 mt-1 max-w-45 truncate" title={claim.rejection_reason}>
                                                            {claim.rejection_reason}
                                                        </p>
                                                    )
                                                )}
                                            </td>
                                            {activeTab === "denials" && (
                                                <td className="px-6 py-4 text-red-600 text-sm max-w-xs">
                                                    {claim.rejection_reason || "No reason provided"}
                                                </td>
                                            )}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1">
                                                    {activeTab === "denials" && (
                                                        <Link
                                                            href={`/dashboard/encounters/create?id=${claim.encounter_id}&step=4`}
                                                            className="brand-button-primary rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                                                            title="Edit claim and resubmit"
                                                        >
                                                            Resubmit
                                                        </Link>
                                                    )}
                                                    <button
                                                        onClick={() => handleDownload(claim.id)}
                                                        className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition"
                                                        title="Download EDI 837 file"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => toggleHistory(claim.id)}
                                                        className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition"
                                                        title={expandedHistory === claim.id ? "Hide history" : "View history"}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedHistory === claim.id && (
                                            <tr key={`${claim.id}-history`}>
                                                <td colSpan={activeTab === "denials" ? 7 : 6} className="px-6 py-4 bg-slate-50">
                                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Status History</p>
                                                    {loadingHistory === claim.id ? (
                                                        <p className="text-xs text-slate-400">Loading...</p>
                                                    ) : (statusHistories[claim.id] || []).length === 0 ? (
                                                        <p className="text-xs text-slate-400">No history yet.</p>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {(statusHistories[claim.id] || []).map((h) => (
                                                                <div key={h.id} className="flex items-start gap-3">
                                                                    <Badge variant={statusBadgeVariant(h.status)} size="sm">
                                                                        {h.status}
                                                                    </Badge>
                                                                    <div>
                                                                        {h.reason && <p className="text-xs text-red-600">{h.reason}</p>}
                                                                        <p className="text-xs text-slate-400">{formatDateTime(h.changed_at)}</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
