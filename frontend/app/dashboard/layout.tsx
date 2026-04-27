"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import Sidebar from "@/app/components/ui/Sidebar";
import { useIdleTimeout } from "@/app/hooks/useIdleTimeout";
import { authApi } from "@/app/lib/api/auth";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// Global scroll-to-center on focus for any input/select/textarea in the dashboard.
// This covers raw HTML elements that don't go through the Input component.
function useFormAutoScroll() {
    useEffect(() => {
        const handler = (e: FocusEvent) => {
            const el = e.target as HTMLElement;
            if (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA") {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        };
        document.addEventListener("focusin", handler);
        return () => document.removeEventListener("focusin", handler);
    }, []);
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [collapsed, setCollapsed] = useState(() => {
        if (typeof window === "undefined") return false;
        return localStorage.getItem("sidebar-collapsed") === "true";
    });
    const [mobileOpen, setMobileOpen] = useState(false);
    const [hoverOpen, setHoverOpen] = useState(false);
    const effectiveCollapsed = collapsed && !hoverOpen;
    useFormAutoScroll();

    const handleIdle = useCallback(async () => {
        try { await authApi.signout(); } catch { /* ignore */ }
        router.push("/login?reason=idle");
    }, [router]);

    useIdleTimeout(IDLE_TIMEOUT_MS, handleIdle);

    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/login");
        }
    }, [user, isLoading, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <p className="text-slate-600">Loading...</p>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="flex min-h-screen bg-slate-100">
            <Sidebar
                collapsed={effectiveCollapsed}
                onToggle={() => setCollapsed((c) => {
                    const next = !c;
                    localStorage.setItem("sidebar-collapsed", String(next));
                    return next;
                })}
                mobileOpen={mobileOpen}
                onMobileClose={() => setMobileOpen(false)}
                onHoverEnter={() => { if (collapsed) setHoverOpen(true); }}
                onHoverLeave={() => setHoverOpen(false)}
            />

            {/* Mobile overlay backdrop */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 md:hidden"
                    onClick={() => setMobileOpen(false)}
                    aria-hidden="true"
                />
            )}

            <div className={`flex flex-1 flex-col min-h-screen transition-all duration-300 ${effectiveCollapsed ? "md:ml-16" : "md:ml-60"}`}>
                {/* Mobile top bar */}
                <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 md:hidden">
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                        aria-label="Open navigation"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <span className="font-display text-base font-semibold tracking-tight text-slate-900">RevClear</span>
                </header>

                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
