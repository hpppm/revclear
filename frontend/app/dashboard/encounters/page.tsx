"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/app/lib/api/apiClient";
import { Encounter } from "@/app/lib/types";
import Badge from "@/app/components/ui/Badge";
import logger from "@/app/lib/logger";

type BadgeVariant = "success" | "warning" | "error" | "neutral" | "info";

function encounterTypeLabel(type?: string): string {
    switch (type) {
        case "office_visit": return "Office Visit";
        case "telehealth": return "Telehealth";
        case "phone": return "Phone Consultation";
        case "home_visit": return "Home Visit";
        default: return type
            ? type.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
            : "Office Visit";
    }
}

function statusBadgeVariant(status?: string): BadgeVariant {
    switch (status?.toLowerCase()) {
        case "completed": return "success";
        case "ready":
        case "ready_for_review": return "info";
        case "in_progress": return "warning";
        case "archived": return "neutral";
        default: return "neutral";
    }
}

function statusLabel(status?: string): string {
    switch (status) {
        case "ready_for_review": return "Ready for Review";
        case "in_progress": return "In Progress";
        case "completed": return "Completed";
        case "ready": return "Ready";
        case "archived": return "Archived";
        case "scheduled": return "Scheduled";
        default: return status || "Draft";
    }
}

function getContinueStep(encounter: Encounter): number {
    if (encounter.status === "ready" || encounter.status === "completed") return -1;
    if (!encounter.transcript_result_id) return 1;
    return 2;
}

export default function EncountersPage() {
    const [encounters, setEncounters] = useState<Encounter[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const fetchedRef = useRef(false);

    useEffect(() => {
        if (fetchedRef.current) return;
        fetchedRef.current = true;
        fetchEncounters();
    }, []);

    const fetchEncounters = async () => {
        setLoading(true);
        try {
            const res = await apiClient.encounters.getAll();
            setEncounters(res.data?.data || []);
        } catch (err) {
            logger.error("Failed to load encounters", err);
            setError("Failed to load encounters.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        setConfirmDeleteId(null);
        try {
            await apiClient.encounters.delete(id);
            setEncounters((prev) => prev.filter((e) => e.id !== id));
        } catch (err) {
            logger.error("Failed to delete encounter", err);
        } finally {
            setDeletingId(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 py-8 px-4 md:px-8">
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-2">
                            <div className="h-7 w-32 rounded bg-slate-200 animate-pulse" />
                            <div className="h-4 w-64 rounded bg-slate-100 animate-pulse" />
                        </div>
                        <div className="h-9 w-28 rounded-lg bg-slate-200 animate-pulse" />
                    </div>
                    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                            <div className="h-4 w-48 rounded bg-slate-200 animate-pulse" />
                        </div>
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex gap-6 px-6 py-4 border-b border-slate-100">
                                <div className="h-4 w-32 rounded bg-slate-100 animate-pulse" />
                                <div className="h-4 w-24 rounded bg-slate-100 animate-pulse" />
                                <div className="h-4 w-20 rounded bg-slate-100 animate-pulse" />
                                <div className="h-4 w-16 rounded bg-slate-100 animate-pulse ml-auto" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 p-8">
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">{error}</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4 md:px-8">

            {/* Delete confirmation modal */}
            {confirmDeleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
                        <h3 className="text-base font-semibold text-slate-900 mb-2">Delete encounter?</h3>
                        <p className="text-sm text-slate-500 mb-6">This cannot be undone. The encounter and all associated data will be permanently deleted.</p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(confirmDeleteId)}
                                disabled={!!deletingId}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition"
                            >
                                {deletingId ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Encounters</h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            To start a new encounter, open a patient and click Start New Encounter.
                        </p>
                    </div>
                    <Link
                        href="/dashboard/patients"
                        className="brand-button-primary rounded-lg px-4 py-2 text-sm font-semibold text-white transition"
                    >
                        Go to Patients
                    </Link>
                </div>

                {/* Empty state */}
                {encounters.length === 0 ? (
                    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-12 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <p className="text-sm font-medium text-slate-700">No encounters yet</p>
                        <p className="text-xs text-slate-400 mt-1 mb-4">Open a patient profile to start their first encounter.</p>
                        <Link
                            href="/dashboard/patients"
                            className="brand-button-primary inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition"
                        >
                            Go to Patients
                        </Link>
                    </div>
                ) : (
                    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">

                        {/* Summary bar */}
                        <div className="flex items-center gap-6 px-6 py-4 border-b border-slate-100 bg-slate-50 text-sm">
                            <span className="text-slate-500">{encounters.length} encounter{encounters.length !== 1 ? "s" : ""}</span>
                            <span>
                                <span className="font-semibold text-amber-600">
                                    {encounters.filter(e => ["in_progress", "scheduled", "draft"].includes(e.status?.toLowerCase() || "")).length}
                                </span>
                                <span className="text-slate-400 ml-1">in progress</span>
                            </span>
                            <span>
                                <span className="font-semibold text-blue-600">
                                    {encounters.filter(e => ["ready", "ready_for_review"].includes(e.status?.toLowerCase() || "")).length}
                                </span>
                                <span className="text-slate-400 ml-1">ready</span>
                            </span>
                            <span>
                                <span className="font-semibold text-emerald-600">
                                    {encounters.filter(e => e.status?.toLowerCase() === "completed").length}
                                </span>
                                <span className="text-slate-400 ml-1">completed</span>
                            </span>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-xs font-medium uppercase tracking-widest text-slate-400 border-b border-slate-100">
                                        <th className="px-6 py-3 text-left">Patient</th>
                                        <th className="px-6 py-3 text-left">Date</th>
                                        <th className="px-6 py-3 text-left">Type</th>
                                        <th className="px-6 py-3 text-left">Status</th>
                                        <th className="px-6 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {encounters.map((encounter) => (
                                        <tr key={encounter.id} className="hover:bg-slate-50 transition">
                                            <td className="px-6 py-4">
                                                {encounter.patient_id ? (
                                                    <Link
                                                        href={`/dashboard/patients/${encounter.patient_id}`}
                                                        className="font-medium text-slate-900 hover:text-(--brand-600) hover:underline"
                                                    >
                                                        {encounter.patient_name || "Unknown Patient"}
                                                    </Link>
                                                ) : (
                                                    <span className="text-slate-400">Unknown Patient</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {encounter.date_of_service
                                                    ? new Date(encounter.date_of_service).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                                    : "—"}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 capitalize">
                                                {encounterTypeLabel(encounter.encounter_type)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant={statusBadgeVariant(encounter.status)} size="sm">
                                                    {statusLabel(encounter.status)}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-3">
                                                    {encounter.status === "ready" || encounter.status === "completed" ? (
                                                        <Link
                                                            href={`/dashboard/encounters/${encounter.id}`}
                                                            className="inline-flex h-6 items-center text-sm font-semibold text-(--brand-600) hover:text-(--brand-700)"
                                                        >
                                                            View
                                                        </Link>
                                                    ) : (
                                                        <Link
                                                            href={`/dashboard/encounters/create?id=${encounter.id}&step=${getContinueStep(encounter)}`}
                                                            className="inline-flex h-6 items-center text-sm font-semibold text-(--brand-600) hover:text-(--brand-700)"
                                                        >
                                                            Continue
                                                        </Link>
                                                    )}
                                                    <button
                                                        type="button"
                                                        aria-label="Delete encounter"
                                                        disabled={deletingId === encounter.id}
                                                        onClick={() => setConfirmDeleteId(encounter.id)}
                                                        className="inline-flex h-6 w-6 items-center justify-center text-slate-300 hover:text-red-500 disabled:opacity-40 transition"
                                                    >
 <svg xmlns="http://www.w3.org/2000/svg" className=" h-5 w-5" viewBox="0 0 20 20" fill="currentColor" >
                                                            <path fillRule="evenodd" d="M8.5 3a1.5 1.5 0 00-1.415 1H4.5a.5.5 0 000 1H5v9.5A1.5 1.5 0 006.5 16h7a1.5 1.5 0 001.5-1.5V5h.5a.5.5 0 000-1h-2.585A1.5 1.5 0 0011.5 3h-3zm0 1a.5.5 0 00-.5.5V5h4v-.5a.5.5 0 00-.5-.5h-3zM6 6h8v8.5a.5.5 0 01-.5.5h-7a.5.5 0 01-.5-.5V6zm2 2a.5.5 0 10-1 0v5a.5.5 0 001 0V8zm4 .5a.5.5 0 10-1 0v5a.5.5 0 101 0v-5z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
