"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/app/lib/api/apiClient";
import logger from "@/app/lib/logger";
import DashboardHeader from "@/app/components/ui/DashboardHeader";
import Badge from "@/app/components/ui/Badge";

type Encounter = {
    id: string;
    patient_id: string;
    patient_name?: string;
    date_of_service: string | null;
    status: string;
    encounter_type: string | null;
    chief_complaint: string | null;
    place_of_service: string | null;
    created_at: string;
};

function statusBadgeVariant(status: string): "success" | "warning" | "error" | "info" | "neutral" {
    const s = status?.toLowerCase();
    if (["completed"].includes(s)) return "success";
    if (["ready", "ready_for_review"].includes(s)) return "info";
    if (["in_progress", "scheduled"].includes(s)) return "warning";
    if (["archived"].includes(s)) return "neutral";
    return "neutral"; // draft
}

function formatDate(date: string | null) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatStatus(status: string) {
    return status?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "—";
}

export default function EncountersPage() {
    const [encounters, setEncounters] = useState<Encounter[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    useEffect(() => {
        const loadEncounters = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await apiClient.encounters.getAll();
                const raw: Encounter[] = (response.data?.data || response.data || []).map(
                    (e: Record<string, unknown>): Encounter => ({
                        id: e.id as string,
                        patient_id: e.patient_id as string,
                        patient_name: (e.patient_name || e.full_name) as string | undefined,
                        date_of_service: e.date_of_service as string | null,
                        status: (e.status as string) || "draft",
                        encounter_type: e.encounter_type as string | null,
                        chief_complaint: e.chief_complaint as string | null,
                        place_of_service: e.place_of_service as string | null,
                        created_at: e.created_at as string,
                    })
                );
                setEncounters(raw);
            } catch (err) {
                logger.error("Failed to fetch encounters", err);
                setError("Failed to load encounters. Please try again.");
            } finally {
                setLoading(false);
            }
        };
        loadEncounters();
    }, []);

    const statuses = ["all", "draft", "scheduled", "in_progress", "ready_for_review", "ready", "completed", "archived"];

    const filtered = encounters.filter((e) => {
        const matchesSearch =
            e.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
            e.chief_complaint?.toLowerCase().includes(search.toLowerCase()) ||
            e.encounter_type?.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === "all" || e.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="max-w-6xl mx-auto px-6 py-8">
            <DashboardHeader
                title="Encounters"
                subtitle="View and manage all clinical encounters."
                backLink="/dashboard"
            />

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3 mb-6 animate-revealUp stagger-1">
                <input
                    type="text"
                    placeholder="Search by patient, complaint, or type…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="brand-input w-full max-w-sm rounded-lg px-4 py-2 text-sm font-mono"
                />
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="brand-input rounded-lg px-3 py-2 text-sm font-mono"
                >
                    {statuses.map((s) => (
                        <option key={s} value={s}>
                            {s === "all" ? "All statuses" : formatStatus(s)}
                        </option>
                    ))}
                </select>
                <Link
                    href="/dashboard/encounters/create"
                    className="ml-auto brand-button-primary rounded-lg px-4 py-2 text-sm font-semibold transition whitespace-nowrap"
                >
                    + New Encounter
                </Link>
            </div>

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
            ) : filtered.length === 0 ? (
                <div className="glass-card rounded-xl p-12 text-center animate-revealUp">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'var(--rc-elevated)', color: 'var(--rc-text-muted)' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <p className="text-sm font-medium" style={{ color: 'var(--rc-text-secondary)' }}>
                        {search || statusFilter !== "all" ? "No encounters match your filters." : "No encounters yet."}
                    </p>
                    {!search && statusFilter === "all" && (
                        <Link
                            href="/dashboard/encounters/create"
                            className="mt-4 brand-button-primary rounded-lg px-4 py-2 text-sm font-semibold transition"
                        >
                            Start your first encounter
                        </Link>
                    )}
                </div>
            ) : (
                <div className="glass-card rounded-xl overflow-hidden animate-revealUp stagger-2">
                    <div className="flex items-center gap-4 px-6 py-3" style={{ borderBottom: '1px solid var(--rc-border)' }}>
                        <span className="text-xs font-mono" style={{ color: 'var(--rc-text-muted)' }}>
                            {filtered.length} encounter{filtered.length !== 1 ? "s" : ""}
                            {(search || statusFilter !== "all") && encounters.length !== filtered.length
                                ? ` of ${encounters.length}`
                                : ""}
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-[11px] font-mono font-medium uppercase tracking-widest" style={{ color: 'var(--rc-text-faint)', borderBottom: '1px solid var(--rc-border)' }}>
                                    <th className="px-6 py-3 text-left">Patient</th>
                                    <th className="px-6 py-3 text-left">Date of Service</th>
                                    <th className="px-6 py-3 text-left">Type</th>
                                    <th className="px-6 py-3 text-left">Chief Complaint</th>
                                    <th className="px-6 py-3 text-left">Status</th>
                                    <th className="px-6 py-3 text-left"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((encounter, idx) => (
                                    <tr
                                        key={encounter.id}
                                        className="transition-colors table-row-animate group"
                                        style={{
                                            borderBottom: '1px solid var(--rc-border)',
                                            animationDelay: `${idx * 30}ms`,
                                        }}
                                    >
                                        <td className="px-6 py-3.5 font-medium" style={{ color: 'var(--rc-text-primary)' }}>
                                            {encounter.patient_name || (
                                                <span className="italic" style={{ color: 'var(--rc-text-faint)' }}>Unknown patient</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3.5 font-mono text-xs" style={{ color: 'var(--rc-text-secondary)' }}>
                                            {formatDate(encounter.date_of_service)}
                                        </td>
                                        <td className="px-6 py-3.5 font-mono text-xs" style={{ color: 'var(--rc-text-secondary)' }}>
                                            {encounter.encounter_type || "—"}
                                        </td>
                                        <td className="px-6 py-3.5 max-w-xs truncate" style={{ color: 'var(--rc-text-secondary)' }}>
                                            {encounter.chief_complaint || "—"}
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <Badge variant={statusBadgeVariant(encounter.status)} size="sm">
                                                {formatStatus(encounter.status)}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-3.5 text-right">
                                            <Link
                                                href={`/dashboard/encounters/${encounter.id}`}
                                                className="font-mono text-xs font-medium transition-colors"
                                                style={{ color: 'var(--rc-teal)' }}
                                            >
                                                View →
                                            </Link>
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
