"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
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
        <div className="min-h-screen" style={{ background: 'var(--rc-deep)' }}>
            <div className="max-w-6xl mx-auto px-6 py-8">

                {/* Page header */}
                <div className="sticky top-0 z-10 pb-4 mb-4 flex items-start justify-between animate-revealUp" style={{ background: 'var(--rc-deep)' }}>
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.15em] font-mono" style={{ color: 'var(--rc-text-muted)' }}>
                            {organization ? organization.name : "Clinic workspace"}
                        </p>
                        <h1 className="text-2xl font-semibold mt-1" style={{ color: 'var(--rc-text-primary)' }}>
                            {organization
                                ? (greetingName ? `${greeting}, ${greetingName}` : "Dashboard")
                                : "Welcome to RevClear"}
                        </h1>
                        <p className="mt-1 text-sm font-mono" style={{ color: 'var(--rc-text-muted)' }}>
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
                                    className="relative flex items-center justify-center h-9 w-9 rounded-lg transition"
                                    style={{
                                        background: 'var(--rc-surface)',
                                        border: '1px solid var(--rc-border)',
                                        color: 'var(--rc-text-muted)',
                                    }}
                                    aria-label="Notifications"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                    {(claimsPending > 0) && (
                                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold font-mono"
                                            style={{ background: 'var(--rc-rose)', color: 'white' }}>
                                            {claimsPending > 9 ? "9+" : claimsPending}
                                        </span>
                                    )}
                                </button>

                                {notifOpen && (
                                    <>
                                        {/* Backdrop */}
                                        <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
                                        {/* Dropdown */}
                                        <div className="absolute right-0 mt-2 w-72 rounded-xl glass-card z-20 overflow-hidden"
                                            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                                            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--rc-border)' }}>
                                                <p className="text-sm font-semibold" style={{ color: 'var(--rc-text-primary)' }}>Notifications</p>
                                            </div>
                                            <ul className="max-h-64 overflow-y-auto">
                                                {claimsPending > 0 && (
                                                    <li style={{ borderBottom: '1px solid var(--rc-border)' }}>
                                                        <Link
                                                            href="/dashboard/claims"
                                                            onClick={() => setNotifOpen(false)}
                                                            className="flex items-start gap-3 px-4 py-3 transition"
                                                            style={{ color: 'var(--rc-text-primary)' }}
                                                        >
                                                            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                                                                style={{ background: 'var(--rc-amber-glow)', color: 'var(--rc-amber)' }}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                            </span>
                                                            <div>
                                                                <p className="text-sm font-medium">{claimsPending} claim{claimsPending > 1 ? "s" : ""} pending</p>
                                                                <p className="text-xs mt-0.5" style={{ color: 'var(--rc-text-muted)' }}>Review and submit to proceed with billing.</p>
                                                            </div>
                                                        </Link>
                                                    </li>
                                                )}
                                                {encountersCount === 0 && (
                                                    <li style={{ borderBottom: '1px solid var(--rc-border)' }}>
                                                        <Link
                                                            href="/dashboard/encounters/create"
                                                            onClick={() => setNotifOpen(false)}
                                                            className="flex items-start gap-3 px-4 py-3 transition"
                                                            style={{ color: 'var(--rc-text-primary)' }}
                                                        >
                                                            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                                                                style={{ background: 'var(--rc-teal-glow)', color: 'var(--rc-teal)' }}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                </svg>
                                                            </span>
                                                            <div>
                                                                <p className="text-sm font-medium">No encounters yet</p>
                                                                <p className="text-xs mt-0.5" style={{ color: 'var(--rc-text-muted)' }}>Start your first encounter to generate billing codes.</p>
                                                            </div>
                                                        </Link>
                                                    </li>
                                                )}
                                                {patients.length === 0 && (
                                                    <li style={{ borderBottom: '1px solid var(--rc-border)' }}>
                                                        <Link
                                                            href="/dashboard/patients/add"
                                                            onClick={() => setNotifOpen(false)}
                                                            className="flex items-start gap-3 px-4 py-3 transition"
                                                            style={{ color: 'var(--rc-text-primary)' }}
                                                        >
                                                            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                                                                style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                                                </svg>
                                                            </span>
                                                            <div>
                                                                <p className="text-sm font-medium">No patients registered</p>
                                                                <p className="text-xs mt-0.5" style={{ color: 'var(--rc-text-muted)' }}>Add your first patient to get started.</p>
                                                            </div>
                                                        </Link>
                                                    </li>
                                                )}
                                                {claimsPending === 0 && encountersCount > 0 && patients.length > 0 && (
                                                    <li className="px-4 py-6 text-center text-sm" style={{ color: 'var(--rc-text-faint)' }}>
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
                    <div className="glass-card rounded-xl p-8">
                        <div className="h-5 w-48 animate-shimmer rounded mb-4"></div>
                        <div className="h-4 w-64 animate-shimmer rounded mb-2"></div>
                        <div className="h-4 w-52 animate-shimmer rounded"></div>
                    </div>
                ) : organization ? (
                    <>
                        {/* Stat cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            {/* Patients */}
                            <div className="glass-card rounded-xl px-5 py-4 animate-revealUp stagger-1">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[11px] font-mono font-medium uppercase tracking-widest" style={{ color: 'var(--rc-text-muted)' }}>Patients</p>
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </span>
                                </div>
                                <p className="text-3xl font-bold font-mono" style={{ color: 'var(--rc-text-primary)' }}>{patients.length}</p>
                            </div>
                            {/* Encounters */}
                            <div className="glass-card rounded-xl px-5 py-4 animate-revealUp stagger-2">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[11px] font-mono font-medium uppercase tracking-widest" style={{ color: 'var(--rc-text-muted)' }}>Encounters</p>
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'var(--rc-teal-glow)', color: 'var(--rc-teal)' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </span>
                                </div>
                                <p className="text-3xl font-bold font-mono" style={{ color: 'var(--rc-text-primary)' }}>{encountersCount}</p>
                            </div>
                            {/* Claims Pending */}
                            <div className="glass-card rounded-xl px-5 py-4 animate-revealUp stagger-3"
                                style={claimsPending > 0 ? { borderColor: 'rgba(245, 158, 11, 0.2)', background: 'rgba(245, 158, 11, 0.06)' } : {}}>
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[11px] font-mono font-medium uppercase tracking-widest" style={{ color: 'var(--rc-text-muted)' }}>Pending</p>
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'var(--rc-amber-glow)', color: 'var(--rc-amber)' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </span>
                                </div>
                                <p className="text-3xl font-bold font-mono" style={{ color: 'var(--rc-amber)' }}>{claimsPending}</p>
                            </div>
                            {/* Claims Approved */}
                            <div className="glass-card rounded-xl px-5 py-4 animate-revealUp stagger-4"
                                style={claimsApproved > 0 ? { borderColor: 'rgba(0, 212, 184, 0.2)', background: 'rgba(0, 212, 184, 0.06)' } : {}}>
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[11px] font-mono font-medium uppercase tracking-widest" style={{ color: 'var(--rc-text-muted)' }}>Approved</p>
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'var(--rc-teal-glow)', color: 'var(--rc-teal)' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </span>
                                </div>
                                <p className="text-3xl font-bold font-mono" style={{ color: 'var(--rc-teal)' }}>{claimsApproved}</p>
                            </div>
                        </div>

                        {/* Recent patients */}
                        <div className="glass-card rounded-xl animate-revealUp stagger-5">
                            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--rc-border)' }}>
                                <h2 className="text-sm font-semibold" style={{ color: 'var(--rc-text-primary)' }}>Recent Patients</h2>
                                <Link
                                    href="/dashboard/patients"
                                    className="brand-button-primary rounded-lg px-4 py-2 text-xs font-semibold transition"
                                >
                                    View All Patients
                                </Link>
                            </div>
                            {patients.length === 0 ? (
                                <div className="px-6 py-10 text-center">
                                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full" style={{ background: 'var(--rc-elevated)', color: 'var(--rc-text-muted)' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2h5M12 12a4 4 0 100-8 4 4 0 000 8z" />
                                        </svg>
                                    </div>
                                    <p className="text-sm" style={{ color: 'var(--rc-text-muted)' }}>
                                        No patients yet. Add your first patient to get started.
                                    </p>
                                </div>
                            ) : (
                                <ul>
                                    {patients.slice(0, 5).map((p, idx) => {
                                        const dob = p.dob ? new Date(p.dob).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
                                        const initials = p.name
                                            ? p.name.split(" ").slice(0, 2).map((n: string) => n.charAt(0).toUpperCase()).join("")
                                            : "?";
                                        return (
                                            <li key={p.id} style={{ borderBottom: '1px solid var(--rc-border)' }}>
                                                <Link
                                                    href={`/dashboard/patients/${p.id}`}
                                                    className="flex items-center justify-between px-6 py-3.5 transition group table-row-animate"
                                                    style={{ animationDelay: `${idx * 50}ms` }}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="brand-accent-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold font-mono">
                                                            {initials}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium" style={{ color: 'var(--rc-text-primary)' }}>{p.name}</p>
                                                            <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--rc-text-muted)' }}>DOB: {dob}</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs font-mono" style={{ color: 'var(--rc-text-faint)' }}>{p.insuranceType || "Self-Pay"}</span>
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
                    <div className="glass-card rounded-xl p-8 animate-revealUp">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                            <div className="lg:col-span-2 space-y-4">
                                <div>
                                    <p className="text-sm font-mono" style={{ color: 'var(--rc-text-muted)' }}>Welcome to RevClear</p>
                                    <h2 className="text-2xl font-semibold mt-1" style={{ color: 'var(--rc-text-primary)' }}>Set up your clinic workspace</h2>
                                    <p className="mt-1" style={{ color: 'var(--rc-text-secondary)' }}>
                                        Create a new clinic or join with an invitation code from an existing organization.
                                        You can start adding patients as soon as you have a home clinic.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <span className="inline-flex items-center rounded-full text-xs font-semibold font-mono px-3 py-1"
                                        style={{ background: 'var(--rc-teal-glow)', color: 'var(--rc-teal)' }}>
                                        HIPAA-friendly defaults
                                    </span>
                                    <span className="inline-flex items-center rounded-full text-xs font-semibold font-mono px-3 py-1"
                                        style={{ background: 'var(--rc-teal-glow)', color: 'var(--rc-teal)' }}>
                                        Multi-clinician ready
                                    </span>
                                </div>
                                {orgError && (
                                    <div className="rounded-lg px-4 py-3" style={{ background: 'var(--rc-rose-glow)', border: '1px solid rgba(244, 63, 94, 0.2)', color: 'var(--rc-rose)' }}>
                                        {orgError}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-4">
                                <form onSubmit={handleCreate} className="glass-card rounded-xl p-4">
                                    <p className="text-sm font-semibold" style={{ color: 'var(--rc-text-primary)' }}>Create an organization</p>
                                    <p className="text-sm mb-3" style={{ color: 'var(--rc-text-muted)' }}>Pick a name so your team recognizes it.</p>
                                    <input
                                        value={orgName}
                                        onChange={(e) => setOrgName(e.target.value)}
                                        placeholder="Clinic name"
                                        className="brand-input w-full rounded-lg px-3 py-2 text-sm font-mono"
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
                                <form onSubmit={handleJoin} className="glass-card rounded-xl p-4">
                                    <p className="text-sm font-semibold" style={{ color: 'var(--rc-text-primary)' }}>Join with invite</p>
                                    <p className="text-sm mb-3" style={{ color: 'var(--rc-text-muted)' }}>Enter the code shared by your clinic.</p>
                                    <input
                                        value={inviteCode}
                                        onChange={(e) => setInviteCode(e.target.value)}
                                        placeholder="Invitation code"
                                        className="brand-input w-full rounded-lg px-3 py-2 text-sm font-mono"
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
