"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { apiClient } from "@/app/lib/api/apiClient";
import { Encounter, Organization, Patient } from "@/app/lib/types";
import logger from "@/app/lib/logger";

type ApiOrganizationPayload = {
    data?: unknown;
    organization?: Organization;
};

const extractOrganization = (payload: ApiOrganizationPayload | unknown): Organization | null => {
    if (!payload || typeof payload !== "object") return null;
    // Support shapes: { data: { organization } }, { data }, or direct object
    const typed = payload as { data?: unknown; organization?: Organization };
    if (typed.data && typeof typed.data === "object") {
        const data = typed.data as { organization?: Organization; data?: Organization };
        if (data.organization) return data.organization;
        if (data.data) return data.data;
    }
    if (typed.organization) return typed.organization;
    return payload as Organization;
};

type RawPatient = {
    id: string;
    full_name?: string;
    name?: string;
    age?: number;
    dob?: string;
    phone?: string;
    insurance_provider?: string;
    insurance_policy_number?: string;
    diagnosis?: string;
};

const mapPatient = (p: RawPatient): Patient => ({
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
    const [encounters, setEncounters] = useState<Encounter[]>([]);
    const [encountersLoading, setEncountersLoading] = useState(false);

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
        if (orgLoading || authLoading) return;
        if (!organization && requiresOrganization) {
            router.push("/dashboard/organization");
        }
    }, [orgLoading, authLoading, organization, requiresOrganization, router]);

    const refreshDashboard = useCallback(async () => {
        if (organization) {
            await Promise.all([loadPatients(), loadEncounters()]);
        }
    }, [organization]);

    useEffect(() => {
        if (organization) {
            void refreshDashboard();
        } else {
            setPatients([]);
            setPatientsLoading(false);
            setPatientsError(null);
        }
    }, [organization, refreshDashboard]);

    useEffect(() => {
        if (!organization) return;
        const interval = setInterval(() => {
            void refreshDashboard();
        }, 30000);
        return () => clearInterval(interval);
    }, [organization, refreshDashboard]);

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
        } catch (error: unknown) {
            // 404/empty means no organization yet; treat gracefully
            const status = typeof error === "object" && error !== null && "response" in error
                ? (error as { response?: { status?: number } }).response?.status
                : undefined;
            if (status === 404) {
                setOrganization(null);
            } else {
                const message = typeof error === "object" && error !== null && "response" in error
                    ? ((error as { response?: { data?: { message?: string; error?: string } } }).response?.data?.message
                        || (error as { response?: { data?: { message?: string; error?: string } } }).response?.data?.error)
                    : undefined;
                setOrgError(message || "Unable to load organization.");
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
        setEncountersLoading(true);
        try {
            const response = await apiClient.encounters.getAll();
            const list = response.data?.data || [];
            setEncounters(Array.isArray(list) ? list : []);
            setEncountersCount(Array.isArray(list) ? list.length : 0);
        } catch (error) {
            logger.error("Failed to fetch encounters", error);
            setEncounters([]);
            setEncountersCount(0);
        } finally {
            setEncountersLoading(false);
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
        } catch (error: unknown) {
            logger.error("Failed to create organization", error);
            let message = "Could not create organization.";
            const responseData = typeof error === "object" && error !== null && "response" in error
                ? (error as { response?: { data?: { errors?: Array<{ path: string[]; message: string }>; message?: string; error?: string } } }).response?.data
                : undefined;
            if (responseData?.errors && Array.isArray(responseData.errors)) {
                message = responseData.errors
                    .map((err) => `${err.path.join(".")}: ${err.message}`)
                    .join(", ");
            } else if (responseData?.message) {
                message = responseData.message;
            } else if (responseData?.error) {
                message = responseData.error;
            }
            setOrgError(message);
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
        } catch (error: unknown) {
            logger.error("Failed to join organization", error);
            let message = "Could not join organization.";
            const responseData = typeof error === "object" && error !== null && "response" in error
                ? (error as { response?: { data?: { errors?: Array<{ path: string[]; message: string }>; message?: string; error?: string } } }).response?.data
                : undefined;
            if (responseData?.errors && Array.isArray(responseData.errors)) {
                message = responseData.errors
                    .map((err) => `${err.path.join(".")}: ${err.message}`)
                    .join(", ");
            } else if (responseData?.message) {
                message = responseData.message;
            } else if (responseData?.error) {
                message = responseData.error;
            }
            setOrgError(message);
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

    const practitionerLabel = useMemo(() => {
        const type = user?.practitionerType || "";
        if (type.toLowerCase().includes("speech")) return "Speech Therapy";
        if (type.toLowerCase().includes("mental")) return "Mental Health";
        if (type.toLowerCase().includes("physical") || type.toLowerCase().includes("physio")) return "Physiotherapy";
        return type || "Clinical";
    }, [user?.practitionerType]);

    const activeEncounters = useMemo(
        () =>
            encounters.filter((e) => e.status !== "completed" && e.status !== "archived"),
        [encounters]
    );
    const readyForReview = useMemo(
        () => encounters.filter((e) => e.status === "ready_for_review" || e.status === "ready"),
        [encounters]
    );
    const readyClaims = useMemo(
        () => encounters.filter((e) => e.status === "ready"),
        [encounters]
    );
    const patientNameById = useMemo(() => {
        const map = new Map<string, string>();
        patients.forEach((p) => {
            if (p.id && p.name) {
                map.set(p.id, p.name);
            }
        });
        return map;
    }, [patients]);

    const workQueue = useMemo(
        () =>
            encounters
                .filter((e) => e.status !== "completed" && e.status !== "archived")
                .slice(0, 6),
        [encounters]
    );

    const getEncounterLink = (encounter: Encounter) => {
        if (encounter.status === "completed" || encounter.status === "archived") {
            return `/dashboard/encounters/${encounter.id}`;
        }
        let step = 0;
        switch (encounter.status) {
            case "draft":
            case "scheduled":
                step = 0;
                break;
            case "in_progress":
                step = 1;
                break;
            case "ready_for_review":
                step = 2;
                break;
            case "ready":
                step = 4;
                break;
            default:
                step = 0;
        }
        return `/dashboard/encounters/create?id=${encounter.id}&step=${step}`;
    };

    return (
        <div className="space-y-10">
            <div className="flex flex-col gap-3">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    {practitionerLabel} dashboard
                </p>
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h1 className="text-3xl font-semibold text-slate-900">
                            {organization ? "Clinic command center" : "Welcome to RevClear"}
                        </h1>
                        <p className="text-slate-600 max-w-2xl">
                            {organization
                                ? "Track in-progress documentation, review queued work, and keep claims moving."
                                : "Create a clinic or join with an invitation code to unlock patient management and billing workflows."}
                        </p>
                    </div>
                    {organization && (
                        <div className="flex flex-wrap gap-2">
                            <Link
                                href="/dashboard/encounters/create"
                                className="rounded-2xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600"
                            >
                                New encounter
                            </Link>
                            <Link
                                href="/dashboard/patients/add"
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Add patient
                            </Link>
                            <button
                                type="button"
                                onClick={() => void refreshDashboard()}
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Refresh
                            </button>
                        </div>
                    )}
                </div>
            </div>

                {orgLoading ? (
                    <div className="rounded-md bg-white border border-slate-300 p-4 animate-pulse">
                        <div className="h-6 w-48 bg-slate-200 rounded mb-4"></div>
                        <div className="h-4 w-64 bg-slate-200 rounded mb-2"></div>
                        <div className="h-4 w-52 bg-slate-200 rounded"></div>
                    </div>
                ) : organization ? (
                    <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 rounded-2xl bg-teal-700 text-white flex items-center justify-center text-sm font-semibold">
                                        {orgInitials}
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Active organization</p>
                                        <h2 className="text-lg font-semibold leading-tight text-slate-900">
                                            {organization.billing_name || organization.name}
                                        </h2>
                                        {formattedAddress && (
                                            <p className="text-slate-600 mt-1">{formattedAddress}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link
                                        href="/dashboard/organization"
                                        className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 transition"
                                        aria-label="Organization settings"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </Link>
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-4">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
                                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Total patients</p>
                                    <p className="mt-3 text-2xl font-semibold text-slate-900">{patients.length || 0}</p>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
                                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Active encounters</p>
                                    <p className="mt-3 text-2xl font-semibold text-slate-900">{activeEncounters.length}</p>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
                                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Ready for review</p>
                                    <p className="mt-3 text-2xl font-semibold text-slate-900">{readyForReview.length}</p>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
                                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Claims ready</p>
                                    <p className="mt-3 text-2xl font-semibold text-slate-900">{readyClaims.length}</p>
                                </div>
                            </div>

                            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                                <div className="rounded-2xl border border-slate-200 bg-white/90 p-5">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Work queue</p>
                                            <h3 className="mt-2 text-lg font-semibold text-slate-900">In-progress notes</h3>
                                            <p className="text-sm text-slate-500">Encounters that need review or completion.</p>
                                        </div>
                                        <Link
                                            href="/dashboard/encounters/create"
                                            className="rounded-2xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-100"
                                        >
                                            Start new
                                        </Link>
                                    </div>
                                    <div className="mt-4 space-y-3">
                                        {encountersLoading ? (
                                            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-500">
                                                Loading work queue...
                                            </div>
                                        ) : workQueue.length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-500">
                                                No active work yet.
                                            </div>
                                        ) : (
                                            workQueue.map((encounter) => (
                                                <Link
                                                    key={encounter.id}
                                                    href={getEncounterLink(encounter)}
                                                    className="block"
                                                >
                                                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 transition hover:border-slate-300">
                                                        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                                                            <div>
                                                                <p className="text-sm font-semibold text-slate-900">
                                                                {encounter.patient_name || patientNameById.get(encounter.patient_id) || "Unnamed patient"}
                                                                </p>
                                                                <p className="text-xs text-slate-500">
                                                                    Status · {encounter.status.replace("_", " ")}
                                                                </p>
                                                            </div>
                                                            <span className="text-xs font-semibold text-teal-700">
                                                                Open
                                                            </span>
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-white/90 p-5">
                                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Today</p>
                                    <h3 className="mt-2 text-lg font-semibold text-slate-900">Documentation progress</h3>
                                    <div className="mt-4 space-y-3 text-sm text-slate-600">
                                        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                                            <span>Encounters created</span>
                                            <span className="font-semibold text-slate-900">{encountersCount}</span>
                                        </div>
                                        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                                            <span>Ready for review</span>
                                            <span className="font-semibold text-slate-900">{readyForReview.length}</span>
                                        </div>
                                        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                                            <span>Claims ready</span>
                                            <span className="font-semibold text-slate-900">{readyClaims.length}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-md bg-white border border-slate-300 p-4">
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
                                <form onSubmit={handleCreate} className="rounded-md border border-slate-200 bg-slate-50 p-4">
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
                                <form onSubmit={handleJoin} className="rounded-md border border-slate-200 bg-white p-4">
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
                    <section className="space-y-4">
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
                                    href="/dashboard/patients"
                                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    View all
                                </Link>
                                <Link
                                    href="/dashboard/patients/add"
                                    className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                                >
                                    Add patient
                                </Link>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {patientsLoading ? (
                                    <div className="p-4 text-slate-600 text-center bg-white rounded-2xl border border-slate-200">Loading patients...</div>
                                ) : patientsError ? (
                                    <div className="p-4 text-red-700 bg-red-50 border border-red-100 rounded-2xl">
                                        {patientsError}
                                    </div>
                                ) : patients.length === 0 ? (
                                    <div className="p-4 text-slate-600 text-center bg-white rounded-2xl border border-slate-200">
                                        No patients yet. Add your first patient to get started.
                                    </div>
                                ) : (
                                patients.slice(0, 6).map((p) => {
                                    const dob = p.dob ? new Date(p.dob).toLocaleDateString() : "—";
                                    return (
                                        <Link
                                            key={p.id}
                                            href={`/dashboard/patients/${p.id}`}
                                            className="block group"
                                        >
                                            <div className="bg-white rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 cursor-pointer">
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                                    <div className="md:col-span-1">
                                                        <p className="text-lg font-semibold text-slate-900 group-hover:text-slate-700 transition-colors">
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
    );
}
