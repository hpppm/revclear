"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { apiClient } from "@/app/lib/api/apiClient";
import { Organization, Patient } from "@/app/lib/types";
import logger from "@/app/lib/logger";

type ApiOrganizationPayload = {
    data?: any;
    organization?: Organization;
};

const extractOrganization = (payload: ApiOrganizationPayload | any): Organization | null => {
    if (!payload) return null;
    // Support shapes: { data: { organization } }, { data }, or direct object
    if (payload.data?.organization) return payload.data.organization as Organization;
    if (payload.data?.data) return payload.data.data as Organization;
    if (payload.data) return payload.data as Organization;
    if (payload.organization) return payload.organization as Organization;
    return payload as Organization;
};

const mapPatient = (p: any): Patient => ({
    id: p.id,
    name: p.full_name || p.name,
    age: p.age || 0,
    dob: p.dob,
    phone: p.phone,
    insuranceType: p.insurance_provider,
    insuranceId: p.insurance_policy_number,
    diagnosis: p.diagnosis,
});

export default function DashboardHome() {
    const router = useRouter();
    const { user, isLoading: authLoading, requiresOrganization } = useAuth();
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [orgLoading, setOrgLoading] = useState(true);
    const [orgError, setOrgError] = useState<string | null>(null);

    const [patients, setPatients] = useState<Patient[]>([]);
    const [patientsLoading, setPatientsLoading] = useState(false);
    const [patientsError, setPatientsError] = useState<string | null>(null);

    const [encountersCount, setEncountersCount] = useState<number>(0);

    const [orgName, setOrgName] = useState("");
    const [inviteCode, setInviteCode] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [isJoining, setIsJoining] = useState(false);

    useEffect(() => {
        if (!authLoading && user) {
            loadOrganization();
        }
    }, [authLoading, user]);

    useEffect(() => {
        if (organization) {
            loadPatients();
            loadEncounters();
        } else {
            setPatients([]);
            setPatientsLoading(false);
            setPatientsError(null);
        }
    }, [organization]);

    const loadOrganization = async () => {
        setOrgLoading(true);
        setOrgError(null);
        try {
            const response = await apiClient.organizations.getCurrent();
            const org = extractOrganization(response);
            if ((response.data && response.data.requiresOrganization) || !org) {
                setOrganization(null);
            } else {
                setOrganization(org);
            }
        } catch (error: any) {
            // 404/empty means no organization yet; treat gracefully
            if (error?.response?.status === 404) {
                setOrganization(null);
            } else {
                // SECURITY: Use sanitized error.message from axios interceptor
                setOrgError(error?.message || "Unable to load organization.");
                setOrganization(null);
            }
        } finally {
            setOrgLoading(false);
        }
    };

    const loadPatients = async () => {
        setPatientsLoading(true);
        setPatientsError(null);
        try {
            const response = await apiClient.patients.getAll();
            const rawPatients = response.data?.data || [];
            const mapped = Array.isArray(rawPatients) ? rawPatients.map(mapPatient) : [];
            setPatients(mapped);
        } catch (error) {
            logger.error("Failed to fetch patients", error);
            setPatientsError("Failed to load patients. Please try again.");
        } finally {
            setPatientsLoading(false);
        }
    };

    const loadEncounters = async () => {
        try {
            const response = await apiClient.encounters.getAll();
            const count = response.data?.data?.length || 0;
            setEncountersCount(count);
        } catch (error) {
            logger.error("Failed to fetch encounters", error);
        }
    };

    const handleCreate = async (e: FormEvent) => {
        e.preventDefault();
        if (!orgName.trim()) {
            setOrgError("Please enter a clinic name.");
            return;
        }
        setIsCreating(true);
        setOrgError(null);
        try {
            const response = await apiClient.organizations.create({ name: orgName.trim() });
            const org = extractOrganization(response);
            setOrganization(org);
            setOrgName("");
        } catch (error: any) {
            logger.error("Failed to create organization", error);
            // SECURITY: Use sanitized error.message from axios interceptor
            setOrgError(error?.message || "Could not create organization.");
        } finally {
            setIsCreating(false);
        }
    };

    const handleJoin = async (e: FormEvent) => {
        e.preventDefault();
        if (!inviteCode.trim()) {
            setOrgError("Enter the invitation code sent by the clinic.");
            return;
        }
        setIsJoining(true);
        setOrgError(null);
        try {
            const response = await apiClient.organizations.joinWithCode(inviteCode.trim());
            const org = extractOrganization(response);
            setOrganization(org);
            setInviteCode("");
        } catch (error: any) {
            logger.error("Failed to join organization", error);
            // SECURITY: Use sanitized error.message from axios interceptor
            setOrgError(error?.message || "Could not join organization.");
        } finally {
            setIsJoining(false);
        }
    };

    const orgInitials = useMemo(() => {
        if (!organization?.name) return "RC";
        const parts = organization.name.split(" ").slice(0, 2);
        return parts.map((p) => p.charAt(0).toUpperCase()).join("");
    }, [organization]);

    const formattedAddress = useMemo(() => {
        if (!organization) return null;
        // Prefer billing address if available
        const line1 = organization.billing_address_line1 || organization.address_line1;
        const line2 = organization.billing_address_line2 || organization.address_line2;
        const city = organization.billing_city || organization.city;
        const state = organization.billing_state || organization.state;
        const zip = organization.billing_postal_code || organization.postal_code;

        const segments = [
            line1,
            line2,
            [city, state].filter(Boolean).join(", "),
            zip,
        ].filter(Boolean);
        return segments.join(" · ");
    }, [organization]);

    return (
        <div className="min-h-screen bg-slate-100">
            <div className="max-w-6xl mx-auto px-6 py-10 relative">
                <Link
                    href="/dashboard/profile"
                    className="group absolute -left-2 top-6 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    aria-label="My profile"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 transition group-hover:text-blue-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.8}
                            d="M5.121 17.804A9 9 0 1117.804 5.121M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                    </svg>
                </Link>

                <div className="flex flex-col gap-2 mb-6 pt-4">
                    <p className="text-sm uppercase tracking-[0.12em] text-slate-500">
                        Clinic workspace
                    </p>
                    <h1 className="text-3xl font-semibold text-slate-900">
                        {organization ? "Your organization hub" : "Welcome to RevClear"}
                    </h1>
                    <p className="text-slate-600 max-w-2xl">
                        {organization
                            ? "Review your clinic details and manage patients from a single home base."
                            : "Create a clinic or join with an invitation code to unlock patient management and billing workflows."}
                    </p>
                </div>

                {orgLoading ? (
                    <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-8 animate-pulse">
                        <div className="h-6 w-48 bg-slate-200 rounded mb-4"></div>
                        <div className="h-4 w-64 bg-slate-200 rounded mb-2"></div>
                        <div className="h-4 w-52 bg-slate-200 rounded"></div>
                    </div>
                ) : organization ? (
                    <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white shadow-xl border border-slate-900/40 p-8">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-lg font-semibold backdrop-blur">
                                    {orgInitials}
                                </div>
                                <div>
                                    <p className="text-sm text-blue-100/80">Active organization</p>
                                    <h2 className="text-2xl font-semibold leading-tight">
                                        {organization.billing_name || organization.name}
                                    </h2>
                                    {formattedAddress && (
                                        <p className="text-blue-100/80 mt-1">{formattedAddress}</p>
                                    )}
                                </div>
                            </div>
                            <div className="text-right space-y-1">
                                <div className="flex items-center justify-end gap-2">
                                    <Link
                                        href="/dashboard/organization"
                                        className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 border border-white/20 transition"
                                        aria-label="Organization settings"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </Link>
                                </div>
                                {organization.timezone && (
                                    <p className="text-blue-100/80 text-sm">Timezone · {organization.timezone}</p>
                                )}
                                <p className="text-blue-100/80 text-sm">
                                    {(organization.billing_phone || organization.phone)
                                        ? `Phone · ${organization.billing_phone || organization.phone}`
                                        : "Clinic contact pending"}
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                                <p className="text-xs uppercase tracking-[0.12em] text-blue-100/70">Number of Visits</p>
                                <p className="text-lg font-semibold">
                                    {encountersCount}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                                <p className="text-xs uppercase tracking-[0.12em] text-blue-100/70">Location</p>
                                <p className="text-lg font-semibold">
                                    {organization.billing_state || organization.state || organization.billing_city || organization.city || "—"}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                                <p className="text-xs uppercase tracking-[0.12em] text-blue-100/70">Patients</p>
                                <p className="text-lg font-semibold">{patients.length || "—"}</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-3xl bg-white shadow-sm border border-slate-200 p-8">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                            <div className="lg:col-span-2 space-y-4">
                                <div>
                                    <p className="text-sm text-slate-500">Welcome to RevClear</p>
                                    <h2 className="text-2xl font-semibold text-slate-900">
                                        Set up your clinic workspace
                                    </h2>
                                    <p className="text-slate-600 mt-1">
                                        Create a new clinic or join with an invitation code from an existing organization.
                                        You can start adding patients as soon as you have a home clinic.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1">
                                        HIPAA-friendly defaults
                                    </span>
                                    <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1">
                                        Multi-clinician ready
                                    </span>
                                </div>
                                {orgError && (
                                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                                        {orgError}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-4">
                                <form onSubmit={handleCreate} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-sm font-semibold text-slate-900">Create an organization</p>
                                    <p className="text-sm text-slate-600 mb-3">
                                        Pick a name so your team recognizes it.
                                    </p>
                                    <input
                                        value={orgName}
                                        onChange={(e) => setOrgName(e.target.value)}
                                        placeholder="Clinic name"
                                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                    />
                                    <button
                                        type="submit"
                                        className="mt-3 w-full rounded-lg bg-slate-900 text-white text-sm font-semibold py-2.5 hover:bg-slate-800 transition disabled:opacity-50"
                                        disabled={isCreating}
                                    >
                                        {isCreating ? "Creating..." : "Create organization"}
                                    </button>
                                </form>
                                <form onSubmit={handleJoin} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                    <p className="text-sm font-semibold text-slate-900">Join with invite</p>
                                    <p className="text-sm text-slate-600 mb-3">
                                        Enter the code shared by your clinic.
                                    </p>
                                    <input
                                        value={inviteCode}
                                        onChange={(e) => setInviteCode(e.target.value)}
                                        placeholder="Invitation code"
                                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                    />
                                    <button
                                        type="submit"
                                        className="mt-3 w-full rounded-lg border border-slate-900 text-slate-900 text-sm font-semibold py-2.5 hover:bg-slate-900 hover:text-white transition disabled:opacity-50"
                                        disabled={isJoining}
                                    >
                                        {isJoining ? "Joining..." : "Join organization"}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {organization && (
                    <section className="mt-10 space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div>
                                <p className="text-sm text-slate-500">Patients</p>
                                <h3 className="text-xl font-semibold text-slate-900">
                                    Registered patients in {organization.name}
                                </h3>
                                <p className="text-slate-600">
                                    Quick access to charts and encounters for your clinic.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Link
                                    href="/dashboard/patients/add"
                                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
                                >
                                    Add patient
                                </Link>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {patientsLoading ? (
                                <div className="p-6 text-slate-600 text-center bg-white rounded-2xl border border-slate-200">Loading patients...</div>
                            ) : patientsError ? (
                                <div className="p-6 text-red-700 bg-red-50 border border-red-100 rounded-2xl">
                                    {patientsError}
                                </div>
                            ) : patients.length === 0 ? (
                                <div className="p-6 text-slate-600 text-center bg-white rounded-2xl border border-slate-200">
                                    No patients yet. Add your first patient to get started.
                                </div>
                            ) : (
                                patients.map((p) => {
                                    const dob = p.dob ? new Date(p.dob).toLocaleDateString() : "—";
                                    return (
                                        <Link
                                            key={p.id}
                                            href={`/dashboard/patients/${p.id}`}
                                            className="block group"
                                        >
                                            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm transition hover:shadow-md hover:border-blue-300 cursor-pointer">
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                                    <div className="md:col-span-1">
                                                        <p className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                                                            {p.name}
                                                        </p>
                                                        <p className="text-sm text-slate-500 mt-1">
                                                            DOB: {dob}
                                                        </p>
                                                    </div>
                                                    <div className="md:col-span-1">
                                                        <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">Phone</p>
                                                        <p className="text-sm text-slate-700 font-medium mt-0.5">{p.phone || "—"}</p>
                                                    </div>
                                                    <div className="md:col-span-1">
                                                        <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">Insurance</p>
                                                        {p.insuranceType === "SELF_PAY" || !p.insuranceType ? (
                                                            <span className="inline-flex items-center gap-1.5 mt-0.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-md text-xs font-semibold text-amber-700">
                                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                                Self-Pay
                                                            </span>
                                                        ) : (
                                                            <p className="text-sm text-slate-700 font-medium mt-0.5">{p.insuranceType}</p>
                                                        )}
                                                    </div>
                                                    <div className="md:col-span-1">
                                                        <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">Member ID</p>
                                                        <p className="text-sm text-slate-700 font-medium mt-0.5">{p.insuranceId || "—"}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })
                            )}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
