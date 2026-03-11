"use client";

import Link from "next/link";
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
    const { user, isLoading: authLoading } = useAuth();
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [orgLoading, setOrgLoading] = useState(true);
    const [orgError, setOrgError] = useState<string | null>(null);

    const [patients, setPatients] = useState<Patient[]>([]);
    const [encountersCount, setEncountersCount] = useState<number>(0);
    const [claimsPending, setClaimsPending] = useState<number>(0);
    const [claimsApproved, setClaimsApproved] = useState<number>(0);

    const [orgName, setOrgName] = useState("");
    const [inviteCode, setInviteCode] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);

    useEffect(() => {
        if (!authLoading && user) {
            loadOrganization();
        }
    }, [authLoading, user]);

    useEffect(() => {
        if (organization) {
            loadPatients();
            loadEncounters();
            loadClaims();
        } else {
            setPatients([]);

            setEncountersCount(0);
            setClaimsPending(0);
            setClaimsApproved(0);
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
            if (error?.response?.status === 404) {
                setOrganization(null);
            } else {
                setOrgError(
                    error?.response?.data?.message ||
                    error?.response?.data?.error ||
                    "Unable to load organization."
                );
                setOrganization(null);
            }
        } finally {
            setOrgLoading(false);
        }
    };

    const loadPatients = async () => {
        try {
            const response = await apiClient.patients.getAll();
            const rawPatients = response.data?.data || [];
            const mapped = Array.isArray(rawPatients) ? rawPatients.map(mapPatient) : [];
            setPatients(mapped);
        } catch (error) {
            logger.error("Failed to fetch patients", error);
        }
    };

    const loadEncounters = async () => {
        try {
            const response = await apiClient.encounters.getAll();
            const all: any[] = response.data?.data || [];
            setEncountersCount(all.length);
        } catch (error) {
            logger.error("Failed to fetch encounters", error);
        }
    };

    const loadClaims = async () => {
        try {
            const response = await apiClient.claims.getAll();
            const all: any[] = response.data?.data || [];
            setClaimsPending(all.filter((c) => ["pending", "submitted", "draft"].includes(c.status?.toLowerCase())).length);
            setClaimsApproved(all.filter((c) => ["approved", "paid"].includes(c.status?.toLowerCase())).length);
        } catch (error) {
            logger.error("Failed to fetch claims", error);
        }
    };

    const handleCreate = async (e: FormEvent) => {
        e.preventDefault();
        if (!orgName.trim()) { setOrgError("Please enter a clinic name."); return; }
        setIsCreating(true);
        setOrgError(null);
        try {
            const response = await apiClient.organizations.create({ name: orgName.trim() });
            setOrganization(extractOrganization(response));
            setOrgName("");
        } catch (error: any) {
            logger.error("Failed to create organization", error);
            let message = "Could not create organization.";
            if (error?.response?.data?.errors && Array.isArray(error.response.data.errors)) {
                message = error.response.data.errors.map((err: any) => `${err.path.join(".")}: ${err.message}`).join(", ");
            } else if (error?.response?.data?.message) {
                message = error.response.data.message;
            } else if (error?.response?.data?.error) {
                message = error.response.data.error;
            }
            setOrgError(message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleJoin = async (e: FormEvent) => {
        e.preventDefault();
        if (!inviteCode.trim()) { setOrgError("Enter the invitation code sent by the clinic."); return; }
        setIsJoining(true);
        setOrgError(null);
        try {
            const response = await apiClient.organizations.joinWithCode(inviteCode.trim());
            setOrganization(extractOrganization(response));
            setInviteCode("");
        } catch (error: any) {
            logger.error("Failed to join organization", error);
            let message = "Could not join organization.";
            if (error?.response?.data?.errors && Array.isArray(error.response.data.errors)) {
                message = error.response.data.errors.map((err: any) => `${err.path.join(".")}: ${err.message}`).join(", ");
            } else if (error?.response?.data?.message) {
                message = error.response.data.message;
            } else if (error?.response?.data?.error) {
                message = error.response.data.error;
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
        const line1 = organization.billing_address_line1 || organization.address_line1;
        const line2 = organization.billing_address_line2 || organization.address_line2;
        const city = organization.billing_city || organization.city;
        const state = organization.billing_state || organization.state;
        const zip = organization.billing_postal_code || organization.postal_code;
        const segments = [line1, line2, [city, state].filter(Boolean).join(", "), zip].filter(Boolean);
        return segments.join(" · ");
    }, [organization]);

    const greeting = (() => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 17) return "Good afternoon";
        return "Good evening";
    })();

    const firstName = user?.email
        ? user.email.split("@")[0].split(".")[0]
        : null;
    const greetingName = firstName
        ? firstName.charAt(0).toUpperCase() + firstName.slice(1)
        : null;

    return (
        <div className="min-h-screen bg-slate-100">
            <div className="max-w-6xl mx-auto px-6 py-10">

                {/* Page header */}
                <div className="sticky top-0 z-10 bg-slate-100 pb-4 mb-4 flex items-start justify-between">
                    <div>
                        <p className="text-sm uppercase tracking-[0.12em] text-slate-500">
                            {organization ? organization.name : "Clinic workspace"}
                        </p>
                        <h1 className="text-3xl font-semibold text-slate-900 mt-1">
                            {organization
                                ? (greetingName ? `${greeting}, ${greetingName}` : "Dashboard")
                                : "Welcome to RevClear"}
                        </h1>
                        <p className="text-slate-500 mt-1 text-sm">
                            {organization
                                ? `Today · ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`
                                : "Create a clinic or join with an invitation code to get started."}
                        </p>
                    </div>
                    {organization && (
                        <div className="flex items-center gap-2">
                            {/* Notification bell */}
                            <div className="relative">
                                <button
                                    onClick={() => setNotifOpen((o) => !o)}
                                    className="relative flex items-center justify-center h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:border-slate-300 shadow-sm transition"
                                    aria-label="Notifications"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                    {(claimsPending > 0) && (
                                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                                            {claimsPending > 9 ? "9+" : claimsPending}
                                        </span>
                                    )}
                                </button>

                                {notifOpen && (
                                    <>
                                        {/* Backdrop */}
                                        <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
                                        {/* Dropdown */}
                                        <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white border border-slate-200 shadow-lg z-20 overflow-hidden">
                                            <div className="px-4 py-3 border-b border-slate-100">
                                                <p className="text-sm font-semibold text-slate-900">Notifications</p>
                                            </div>
                                            <ul className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                                                {claimsPending > 0 && (
                                                    <li>
                                                        <Link
                                                            href="/dashboard/claims"
                                                            onClick={() => setNotifOpen(false)}
                                                            className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition"
                                                        >
                                                            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                            </span>
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-900">{claimsPending} claim{claimsPending > 1 ? "s" : ""} pending</p>
                                                                <p className="text-xs text-slate-500 mt-0.5">Review and submit to proceed with billing.</p>
                                                            </div>
                                                        </Link>
                                                    </li>
                                                )}
                                                {encountersCount === 0 && (
                                                    <li>
                                                        <Link
                                                            href="/dashboard/encounters/create"
                                                            onClick={() => setNotifOpen(false)}
                                                            className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition"
                                                        >
                                                            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                </svg>
                                                            </span>
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-900">No encounters yet</p>
                                                                <p className="text-xs text-slate-500 mt-0.5">Start your first encounter to generate billing codes.</p>
                                                            </div>
                                                        </Link>
                                                    </li>
                                                )}
                                                {patients.length === 0 && (
                                                    <li>
                                                        <Link
                                                            href="/dashboard/patients/add"
                                                            onClick={() => setNotifOpen(false)}
                                                            className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition"
                                                        >
                                                            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                                                </svg>
                                                            </span>
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-900">No patients registered</p>
                                                                <p className="text-xs text-slate-500 mt-0.5">Add your first patient to get started.</p>
                                                            </div>
                                                        </Link>
                                                    </li>
                                                )}
                                                {claimsPending === 0 && encountersCount > 0 && patients.length > 0 && (
                                                    <li className="px-4 py-6 text-center text-sm text-slate-400">
                                                        All caught up — no pending tasks.
                                                    </li>
                                                )}
                                            </ul>
                                        </div>
                                    </>
                                )}
                            </div>

                        </div>
                    )}
                </div>

                {/* Org loading skeleton */}
                {orgLoading ? (
                    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8 animate-pulse">
                        <div className="h-6 w-48 bg-slate-200 rounded mb-4"></div>
                        <div className="h-4 w-64 bg-slate-200 rounded mb-2"></div>
                        <div className="h-4 w-52 bg-slate-200 rounded"></div>
                    </div>
                ) : organization ? (
                    <>
                        {/* Big org card */}
                        <div className="rounded-3xl bg-linear-to-br from-slate-900 via-blue-900 to-slate-800 text-white shadow-xl border border-slate-900/40 p-8 mb-6">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-lg font-semibold backdrop-blur">
                                        {orgInitials}
                                    </div>
                                    <div>
                                        <p className="text-sm text-blue-100/80">Active organization</p>
                                        <h2 className="text-2xl font-semibold leading-tight">{organization.billing_name || organization.name}</h2>
                                        {formattedAddress && <p className="text-blue-100/80 mt-1">{formattedAddress}</p>}
                                    </div>
                                </div>
                                <div className="text-right space-y-1">
                                    {organization.timezone && <p className="text-blue-100/80 text-sm">Timezone · {organization.timezone}</p>}
                                    {(organization.billing_phone || organization.phone) && (
                                        <p className="text-blue-100/80 text-sm">Phone · {organization.billing_phone || organization.phone}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Stat cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            {/* Patients */}
                            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm px-5 py-4">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Patients</p>
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-500">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </span>
                                </div>
                                <p className="text-3xl font-bold text-slate-900">{patients.length}</p>
                            </div>
                            {/* Encounters */}
                            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm px-5 py-4">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Encounters</p>
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-500">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </span>
                                </div>
                                <p className="text-3xl font-bold text-slate-900">{encountersCount}</p>
                            </div>
                            {/* Claims Pending */}
                            <div className={`rounded-2xl border shadow-sm px-5 py-4 ${claimsPending > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200"}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Claims Pending</p>
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-500">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </span>
                                </div>
                                <p className="text-3xl font-bold text-amber-600">{claimsPending}</p>
                            </div>
                            {/* Claims Approved */}
                            <div className={`rounded-2xl border shadow-sm px-5 py-4 ${claimsApproved > 0 ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200"}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Claims Approved</p>
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-500">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </span>
                                </div>
                                <p className="text-3xl font-bold text-emerald-600">{claimsApproved}</p>
                            </div>
                        </div>

                        {/* Recent patients */}
                        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                                <h2 className="text-sm font-semibold text-slate-900">Recent Patients</h2>
                                <Link
                                    href="/dashboard/patients"
                                    className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700 transition"
                                >
                                    View All Patients
                                </Link>
                            </div>
                            {patients.length === 0 ? (
                                <div className="px-6 py-10 text-center text-sm text-slate-400">
                                    No patients yet. Add your first patient to get started.
                                </div>
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {patients.slice(0, 5).map((p) => {
                                        const dob = p.dob ? new Date(p.dob).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
                                        const initials = p.name
                                            ? p.name.split(" ").slice(0, 2).map((n: string) => n.charAt(0).toUpperCase()).join("")
                                            : "?";
                                        return (
                                            <li key={p.id}>
                                                <Link
                                                    href="/dashboard/patients"
                                                    className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-xs font-semibold">
                                                            {initials}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition-colors">{p.name}</p>
                                                            <p className="text-xs text-slate-500 mt-0.5">DOB: {dob}</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-slate-400">{p.insuranceType || "Self-Pay"}</span>
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </>
                ) : (
                    /* No org — setup flow */
                    <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-8">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                            <div className="lg:col-span-2 space-y-4">
                                <div>
                                    <p className="text-sm text-slate-500">Welcome to RevClear</p>
                                    <h2 className="text-2xl font-semibold text-slate-900">Set up your clinic workspace</h2>
                                    <p className="text-slate-600 mt-1">
                                        Create a new clinic or join with an invitation code from an existing organization.
                                        You can start adding patients as soon as you have a home clinic.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1">HIPAA-friendly defaults</span>
                                    <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1">Multi-clinician ready</span>
                                </div>
                                {orgError && (
                                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">{orgError}</div>
                                )}
                            </div>
                            <div className="space-y-4">
                                <form onSubmit={handleCreate} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-sm font-semibold text-slate-900">Create an organization</p>
                                    <p className="text-sm text-slate-600 mb-3">Pick a name so your team recognizes it.</p>
                                    <input
                                        value={orgName}
                                        onChange={(e) => setOrgName(e.target.value)}
                                        placeholder="Clinic name"
                                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                    />
                                    <button type="submit" disabled={isCreating} className="mt-3 w-full rounded-lg bg-slate-900 text-white text-sm font-semibold py-2.5 hover:bg-slate-800 transition disabled:opacity-50">
                                        {isCreating ? "Creating..." : "Create organization"}
                                    </button>
                                </form>
                                <form onSubmit={handleJoin} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                    <p className="text-sm font-semibold text-slate-900">Join with invite</p>
                                    <p className="text-sm text-slate-600 mb-3">Enter the code shared by your clinic.</p>
                                    <input
                                        value={inviteCode}
                                        onChange={(e) => setInviteCode(e.target.value)}
                                        placeholder="Invitation code"
                                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                    />
                                    <button type="submit" disabled={isJoining} className="mt-3 w-full rounded-lg border border-slate-900 text-slate-900 text-sm font-semibold py-2.5 hover:bg-slate-900 hover:text-white transition disabled:opacity-50">
                                        {isJoining ? "Joining..." : "Join organization"}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
