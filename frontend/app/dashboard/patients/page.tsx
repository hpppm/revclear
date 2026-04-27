"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/app/lib/api/apiClient";
import { useAuthorization } from "@/app/context/AuthContext";
import logger from "@/app/lib/logger";
import DashboardHeader from "@/app/components/ui/DashboardHeader";
import UnauthorizedState from "@/app/components/ui/UnauthorizedState";

type Patient = {
    id: string;
    name: string;
    dob: string | null;
    phone: string | null;
    email: string | null;
    insuranceType: string | null;
    created_at: string | null;
};

const mapPatient = (p: any): Patient => ({
    id: p.id,
    name: p.full_name,
    dob: p.dob,
    phone: p.phone,
    email: p.email,
    insuranceType: p.insurance_provider,
    created_at: p.created_at,
});

function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function PatientsPage() {
    const { canReadPatients, canWritePatients } = useAuthorization();
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!canReadPatients) {
            setLoading(false);
            return;
        }

        const loadPatients = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await apiClient.patients.getAll();
                const rawPatients = response.data?.data || [];
                const mapped = Array.isArray(rawPatients) ? rawPatients.map(mapPatient) : [];
                setPatients(mapped);
            } catch (err) {
                logger.error("Failed to fetch patients", err);
                setError("Failed to load patients. Please try again.");
            } finally {
                setLoading(false);
            }
        };
        loadPatients();
    }, [canReadPatients]);

    if (!canReadPatients) {
        return (
            <div className="max-w-6xl mx-auto px-6 py-8">
                <UnauthorizedState message="Your role does not have access to patients." />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                <DashboardHeader
                    title="Patients"
                    subtitle="Manage your patients and their profiles."
                />
                {canWritePatients && (
                    <Link
                        href="/dashboard/patients/add"
                        className="brand-button-primary rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition"
                    >
                        + Add New Patient
                    </Link>
                )}
            </div>

            {loading ? (
                <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8 text-center text-slate-500">
                    Loading patients...
                </div>
            ) : error ? (
                <div className="rounded-2xl bg-red-50 border border-red-100 p-6 text-red-700">
                    {error}
                </div>
            ) : patients.length === 0 ? (
                <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-12 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    </div>
                    <p className="text-sm font-medium text-slate-700">No patients found</p>
                    <p className="text-xs text-slate-400 mt-1">Add your first patient to start managing their records.</p>
                    {canWritePatients && (
                        <Link
                            href="/dashboard/patients/add"
                            className="brand-button-primary mt-4 rounded-lg px-4 py-2 text-sm font-semibold transition"
                        >
                            Add Patient
                        </Link>
                    )}
                </div>
            ) : (
                <>
                    {/* Mobile: card list */}
                    <div className="space-y-3 md:hidden">
                        {patients.map((patient) => {
                            const initials = patient.name
                                ? patient.name.split(" ").slice(0, 2).map((n: string) => n.charAt(0).toUpperCase()).join("")
                                : "?";
                            return (
                                <Link
                                    key={patient.id}
                                    href={`/dashboard/patients/${patient.id}`}
                                    className="flex items-center gap-3 rounded-2xl bg-white border border-slate-200 px-4 py-3 shadow-sm active:bg-slate-50"
                                >
                                    <div className="brand-accent-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                                        {initials}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium text-slate-900">{patient.name}</p>
                                        <p className="text-xs text-slate-500">{patient.phone || patient.email || formatDate(patient.dob)}</p>
                                    </div>
                                    <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                        {patient.insuranceType || "Self-Pay"}
                                    </span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Desktop: table */}
                    <div className="hidden md:block rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-xs font-medium uppercase tracking-widest text-slate-400 border-b border-slate-100 bg-slate-50">
                                        <th className="px-6 py-4 text-left">Name</th>
                                        <th className="px-6 py-4 text-left">DOB</th>
                                        <th className="px-6 py-4 text-left">Phone</th>
                                        <th className="px-6 py-4 text-left">Email</th>
                                        <th className="px-6 py-4 text-left">Insurance</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {patients.map((patient) => {
                                        const initials = patient.name
                                            ? patient.name.split(" ").slice(0, 2).map((n: string) => n.charAt(0).toUpperCase()).join("")
                                            : "?";
                                        return (
                                            <tr key={patient.id} className="hover:bg-slate-50 transition group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="brand-accent-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                                                            {initials}
                                                        </div>
                                                        <Link href={`/dashboard/patients/${patient.id}`} className="font-medium text-slate-900 group-hover:text-[var(--brand-600)] transition-colors">
                                                            {patient.name}
                                                        </Link>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-500">{formatDate(patient.dob)}</td>
                                                <td className="px-6 py-4 text-slate-500">{patient.phone || "—"}</td>
                                                <td className="px-6 py-4 text-slate-500">{patient.email || "—"}</td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                                                        {patient.insuranceType || "Self-Pay"}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Link href={`/dashboard/patients/${patient.id}`} className="text-[var(--brand-600)] hover:text-[var(--brand-700)] text-sm font-medium">
                                                        View Profile
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
