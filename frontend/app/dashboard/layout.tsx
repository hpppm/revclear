"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { apiClient } from "@/app/lib/api/apiClient";
import logger from "@/app/lib/logger";
import { Encounter } from "@/app/lib/types";

type TaskItem = {
    id: string;
    title: string;
    detail: string;
    status: string;
    href: string;
    priority: number;
};

const LOGO_FULL = "/revclear-logo/vector/default.svg";

const statusMeta: Record<
    string,
    { title: string; detail: (name?: string) => string; priority: number; tone: string }
> = {
    ready: {
        title: "Submit claim",
        detail: (name) => `Encounter ready for submission${name ? ` · ${name}` : ""}`,
        priority: 1,
        tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    ready_for_review: {
        title: "Review SOAP + codes",
        detail: (name) => `Needs clinical review${name ? ` · ${name}` : ""}`,
        priority: 2,
        tone: "bg-amber-50 text-amber-700 border-amber-200",
    },
    in_progress: {
        title: "Resume documentation",
        detail: (name) => `Continue encounter workflow${name ? ` · ${name}` : ""}`,
        priority: 3,
        tone: "bg-blue-50 text-blue-700 border-blue-200",
    },
    draft: {
        title: "Finish intake",
        detail: (name) => `Complete patient and visit details${name ? ` · ${name}` : ""}`,
        priority: 4,
        tone: "bg-slate-50 text-slate-600 border-slate-200",
    },
};

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [navOpen, setNavOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [tasks, setTasks] = useState<TaskItem[]>([]);
    const [tasksLoading, setTasksLoading] = useState(false);

    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/login");
        }
    }, [user, isLoading, router]);

    useEffect(() => {
        if (user) {
            void loadTasks();
        }
    }, [user]);

    const loadTasks = async () => {
        setTasksLoading(true);
        try {
            const response = await apiClient.encounters.getAll();
            const raw = response.data?.data || response.data || [];
            const items = (Array.isArray(raw) ? (raw as Encounter[]) : [])
                .map((encounter) => {
                    const meta = statusMeta[encounter.status];
                    if (!meta) return null;
                    return {
                        id: encounter.id,
                        title: meta.title,
                        detail: meta.detail(encounter.patient_name),
                        status: encounter.status,
                        href: `/dashboard/encounters/${encounter.id}`,
                        priority: meta.priority,
                    } as TaskItem;
                })
                .filter(Boolean) as TaskItem[];
            items.sort((a, b) => a.priority - b.priority);
            setTasks(items);
        } catch (error) {
            logger.error("Failed to load task notifications", error);
            setTasks([]);
        } finally {
            setTasksLoading(false);
        }
    };

    const navItems = useMemo(
        () => [
            { label: "Dashboard", href: "/dashboard" },
            { label: "Patients", href: "/dashboard/patients" },
            { label: "Encounters", href: "/dashboard/encounters" },
            { label: "Organization", href: "/dashboard/organization" },
            { label: "Invoices", href: "/dashboard/invoices" },
            { label: "Claims", href: "/dashboard/claims" },
            { label: "Submitted", href: "/dashboard/submitted" },
        ],
        []
    );

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center rc-app-shell">
                <p className="text-slate-600">Loading workspace...</p>
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect
    }

    return (
        <div className="min-h-screen bg-slate-100">
            <header className="border-b border-slate-200 bg-white relative">
                <div className="mx-auto max-w-7xl px-4 py-2 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded border border-slate-200 bg-white text-slate-600"
                            onClick={() => setNavOpen((prev) => !prev)}
                            aria-label="Toggle navigation"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <Link href="/dashboard" className="flex items-center gap-2">
                            <LogoFull />
                        </Link>
                    </div>

                    <nav className="hidden lg:flex items-center gap-4 text-sm font-semibold text-slate-600">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`px-2 py-1 border-b-2 ${pathname === item.href
                                    ? "border-slate-900 text-slate-900"
                                    : "border-transparent hover:text-slate-900"
                                    }`}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            className="relative inline-flex h-9 w-9 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 hover:text-slate-900"
                            onClick={() => setNotificationsOpen((prev) => !prev)}
                            aria-label="Notifications"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.17V11a6 6 0 10-12 0v3.17a2 2 0 01-.6 1.43L4 17h5m6 0a3 3 0 11-6 0h6z" />
                            </svg>
                            {tasks.length > 0 && (
                                <span className="absolute -right-1 -top-1 h-4 min-w-[16px] rounded-full bg-emerald-500 px-1 text-[10px] font-semibold text-white">
                                    {tasks.length}
                                </span>
                            )}
                        </button>
                        <Link
                            href="/dashboard/profile"
                            className="inline-flex items-center gap-2 rounded border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300"
                        >
                            <span className="hidden sm:block">{user.name || user.email}</span>
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
                                {getInitials(user.name || user.email || "RC")}
                            </span>
                        </Link>
                    </div>
                </div>

                {notificationsOpen && (
                    <div className="absolute right-4 top-full mt-2 w-[320px] rounded border border-slate-200 bg-white shadow-lg">
                        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
                            <p className="text-xs font-semibold text-slate-700">Tasks & Reminders</p>
                            <button
                                className="text-[11px] text-slate-500 hover:text-slate-700"
                                onClick={() => void loadTasks()}
                            >
                                Refresh
                            </button>
                        </div>
                        <div className="max-h-72 overflow-y-auto p-3 space-y-2">
                            {tasksLoading ? (
                                <p className="text-xs text-slate-500 px-2 py-6 text-center">Loading tasks...</p>
                            ) : tasks.length === 0 ? (
                                <p className="text-xs text-slate-500 px-2 py-6 text-center">
                                    No open tasks.
                                </p>
                            ) : (
                                tasks.map((task) => (
                                    <Link
                                        key={task.id}
                                        href={task.href}
                                        className="block rounded border border-slate-200 bg-slate-50 p-2 hover:border-slate-300 hover:bg-white"
                                    >
                                        <p className="text-xs font-semibold text-slate-900">{task.title}</p>
                                        <p className="text-[11px] text-slate-500 mt-1">{task.detail}</p>
                                        <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] mt-2 ${statusMeta[task.status]?.tone || "border-slate-200 text-slate-500"}`}>
                                            {task.status.split("_").join(" ")}
                                        </span>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {navOpen && (
                    <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setNavOpen(false)}
                                className="block rounded px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>
                )}
            </header>

            <div className="flex bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100">
                <aside className="hidden lg:block w-64 border-r border-slate-200 bg-gradient-to-b from-slate-50 to-white min-h-[calc(100vh-48px)] px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 mb-3">Navigation</p>
                    <nav className="space-y-1">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`group relative flex items-center gap-2 rounded px-3 py-2 text-sm transition ${pathname === item.href
                                    ? "bg-slate-900 text-white"
                                    : "text-slate-700 hover:bg-white hover:shadow-sm"
                                    }`}
                            >
                                {pathname === item.href && (
                                    <span className="absolute left-0 top-2 h-5 w-1 rounded-full bg-teal-500" />
                                )}
                                <span className={`h-6 w-6 rounded-full border text-[10px] flex items-center justify-center ${pathname === item.href ? "border-slate-700 bg-white/90 text-slate-900" : "border-slate-200 bg-white text-slate-600"}`}>
                                    {item.label.charAt(0)}
                                </span>
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </aside>

                <main className="flex-1 p-4">
                    <div className="bg-white/90 border border-slate-200 rounded p-4 shadow-sm">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}

function LogoFull() {
    const [hasError, setHasError] = useState(false);
    if (hasError) {
        return (
            <div className="h-10 w-32 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-semibold">
                RevClear
            </div>
        );
    }
    return (
        <Image
            src={LOGO_FULL}
            alt="RevClear"
            width={140}
            height={32}
            className="h-8 w-auto object-contain rc-logo-hover rc-logo-float"
            onError={() => setHasError(true)}
            priority
        />
    );
}

function getInitials(value: string) {
    const parts = value.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}
