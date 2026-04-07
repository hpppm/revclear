"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import Sidebar from "@/app/components/ui/Sidebar";

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
    const [collapsed, setCollapsed] = useState(false);
    useFormAutoScroll();

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
        return null; // Will redirect
    }

    return (
        <div className="flex min-h-screen bg-slate-100">
            <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
            <main className={`flex-1 min-h-screen overflow-y-auto transition-all duration-300 ${collapsed ? "ml-16" : "ml-60"}`}>
                {children}
            </main>
        </div>
    );
}
