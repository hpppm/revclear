"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import Sidebar from "@/app/components/ui/Sidebar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/login");
        }
    }, [user, isLoading, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--rc-deep)' }}>
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 rounded-full border-2 border-[var(--rc-teal)] border-t-transparent animate-spin" />
                    <p className="text-sm font-mono text-[var(--rc-text-muted)] tracking-wider uppercase">Loading</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect
    }

    return (
        <div className="flex min-h-screen" style={{ background: 'var(--rc-deep)' }}>
            <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
            <main className={`flex-1 min-h-screen overflow-y-auto transition-all duration-300 ${collapsed ? "ml-16" : "ml-60"}`}>
                {children}
            </main>
        </div>
    );
}
