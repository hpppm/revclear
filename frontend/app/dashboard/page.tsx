"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useAuth, useAuthorization } from "@/app/context/AuthContext";
import { apiClient } from "@/app/lib/api/apiClient";
import { Organization, Patient } from "@/app/lib/types";
import logger from "@/app/lib/logger";
import Button from "@/app/components/ui/Button";

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
    const { user, isLoading: authLoading, checkAuth } = useAuth();
    const {
        canReadPatients,
        canManageEncounters,
        canManageClaims,
        canManageOrganization,
        canWritePatients,
    } = useAuthorization();
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

    // Prevent duplicate org fetches when auth context emits multiple values
    const orgFetchInProgressRef = useRef(false);
    // Prevent re-fetching patients/encounters/claims when org reference changes
    // but the underlying data has already been loaded for this session
    const dataFetchedRef = useRef(false);

    useEffect(() => {
        if (!authLoading && user) {
            loadOrganization();
        }
    }, [authLoading, user]);

    useEffect(() => {
        if (organization) {
            if (!dataFetchedRef.current) {
                dataFetchedRef.current = true;
                if (canReadPatients) loadPatients();
                if (canManageEncounters) loadEncounters();
                if (canManageClaims) loadClaims();
            }
        } else {
            dataFetchedRef.current = false;
            setPatients([]);
            setEncountersCount(0);
            setClaimsPending(0);
            setClaimsApproved(0);
        }
    }, [organization, canManageClaims, canManageEncounters, canReadPatients]);

    const loadOrganization = async () => {
        if (orgFetchInProgressRef.current) return;
        orgFetchInProgressRef.current = true;
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
            orgFetchInProgressRef.current = false;
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
            await checkAuth();
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
            await checkAuth();
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
                                    className="relative flex items-center justify-center h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:border-slate-300 shadow-sm transition cursor-pointer"
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
                                                {canManageClaims && claimsPending > 0 && (
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
                                                {canManageEncounters && encountersCount === 0 && (
                                                    <li>
                                                        <Link
                                                            href="/dashboard/patients"
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
                                                {canWritePatients && patients.length === 0 && (
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
                        {/* Stat cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            {/* Patients — info blue */}
                            {canReadPatients && (
                            <div className="rounded-2xl bg-blue-100 border border-blue-200 shadow-sm px-5 py-4">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-medium uppercase tracking-widest text-blue-500">Patients</p>
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-900 text-white">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </span>
                                </div>
                                <p className="text-3xl font-bold text-blue-900">{patients.length}</p>
                            </div>
                            )}
                            {/* Encounters — pink */}
                            {canManageEncounters && (
                            <div className="rounded-2xl border shadow-sm px-5 py-4" style={{ backgroundColor: "#ffe6ee", borderColor: "#ffb3cc" }}>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "#99003d" }}>Encounters</p>
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full text-white" style={{ backgroundColor: "#cc0052" }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </span>
                                </div>
                                <p className="text-3xl font-bold" style={{ color: "#99003d" }}>{encountersCount}</p>
                            </div>
                            )}
                            {/* Claims Pending — warning yellow */}
                            {canManageClaims && (
                            <div className="rounded-2xl bg-yellow-50 border border-yellow-200 shadow-sm px-5 py-4">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-medium uppercase tracking-widest text-yellow-600">Claims Pending</p>
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </span>
                                </div>
                                <p className="text-3xl font-bold text-yellow-700">{claimsPending}</p>
                            </div>
                            )}
                            {/* Claims Approved — success green */}
                            {canManageClaims && (
                            <div className="rounded-2xl bg-green-100 border border-green-200 shadow-sm px-5 py-4">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-medium uppercase tracking-widest text-green-600">Claims Approved</p>
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-800 text-white">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </span>
                                </div>
                                <p className="text-3xl font-bold text-green-900">{claimsApproved}</p>
                            </div>
                            )}
                        </div>

                        {/* Recent patients */}
                        {canReadPatients && (
                        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                                <h2 className="text-sm font-semibold text-slate-900">Recent Patients</h2>
                                <Link
                                    href="/dashboard/patients"
                                    className="brand-button-primary rounded-lg px-4 py-2 text-xs font-semibold transition"
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
                                                    href={`/dashboard/patients/${p.id}`}
                                                    className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="brand-accent-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                                                            {initials}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-900 group-hover:text-[var(--brand-600)] transition-colors">{p.name}</p>
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
                        )}
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
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        loading={isCreating}
                                        className="mt-3 w-full rounded-lg"
                                    >
                                        Create organization
                                    </Button>
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
                                    <Button
                                        type="submit"
                                        variant="secondary"
                                        loading={isJoining}
                                        className="mt-3 w-full rounded-lg"
                                    >
                                        Join organization
                                    </Button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
