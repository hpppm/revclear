"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth, useAuthorization } from "@/app/context/AuthContext";
import { BrandMark } from "@/app/components/ui/BrandMark";

const navItems = [
    {
        label: "Dashboard",
        href: "/dashboard",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        ),
    },
    {
        label: "Patients",
        href: "/dashboard/patients",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
    },
    {
        label: "Visits",
        href: "/dashboard/encounters",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
        ),
    },
    {
        label: "Claims",
        href: "/dashboard/claims",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
            </svg>
        ),
    },
    {
        label: "Organization",
        href: "/dashboard/organization",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
        ),
    },
];

type SidebarProps = {
    collapsed: boolean;
    onToggle: () => void;
    mobileOpen?: boolean;
    onMobileClose?: () => void;
};

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const {
        canReadPatients,
        canManageClaims,
        canManageOrganization,
        canManageEncounters,
    } = useAuthorization();

    const [showHint, setShowHint] = useState(false);
    const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!collapsed) {
            setShowHint(false);
            if (hintTimer.current) clearTimeout(hintTimer.current);
            return;
        }
        setShowHint(true);
        hintTimer.current = setTimeout(() => setShowHint(false), 3000);

        const dismiss = () => setShowHint(false);
        document.addEventListener("mousemove", dismiss, { once: true });
        document.addEventListener("click", dismiss, { once: true });
        return () => {
            document.removeEventListener("mousemove", dismiss);
            document.removeEventListener("click", dismiss);
            if (hintTimer.current) clearTimeout(hintTimer.current);
        };
    }, [collapsed]);

    useEffect(() => {
        setShowHint(false);
        onMobileClose?.();
    }, [pathname]);

    const isActive = (href: string) => {
        if (href === "/dashboard") return pathname === "/dashboard";
        return pathname.startsWith(href);
    };

    const userInitials = user?.email
        ? user.email.slice(0, 2).toUpperCase()
        : "RC";

    return (
        <aside
            className={[
                "fixed inset-y-0 left-0 z-40 flex flex-col bg-slate-900 text-white transition-all duration-300",
                // Desktop: width based on collapsed state
                "md:translate-x-0",
                collapsed ? "md:w-16" : "md:w-60",
                // Mobile: full-width drawer, slides in/out
                "w-72",
                mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
            ].join(" ")}
        >
            {/* Header: logo + hamburger */}
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-3">
                {/* Mobile close button */}
                <button
                    onClick={onMobileClose}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors md:hidden"
                    aria-label="Close navigation"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                {!collapsed && (
                    <div className="flex items-center gap-3">
                        <BrandMark
                            label="RC"
                            size="sm"
                            className="rounded-lg"
                            labelClassName="text-sm tracking-tight"
                        />
                        <div className="flex flex-col leading-tight">
                            <span className="font-display text-base font-semibold tracking-tight">RevClear</span>
                        </div>
                    </div>
                )}
                <div className={`relative ${collapsed ? "mx-auto" : ""}`}>
                    <button
                        onClick={onToggle}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                        aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
                        title={collapsed ? "Expand navigation" : "Collapse navigation"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    {showHint && (
                        <span className="pointer-events-none absolute left-10 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-700 px-2.5 py-1 text-xs text-slate-100 shadow-lg animate-fade-in">
                            Click to expand
                        </span>
                    )}
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
                {navItems.map((item) => (
                    ((item.href === "/dashboard/patients" && !canReadPatients) ||
                    (item.href === "/dashboard/claims" && !canManageClaims) ||
                    (item.href === "/dashboard/encounters" && !canManageEncounters) ||
                    (item.href === "/dashboard/organization" && !canManageOrganization)) ? null : (
                    <Link
                        key={item.href}
                        href={item.href}
                        replace
                        aria-current={isActive(item.href) ? "page" : undefined}
                        title={collapsed ? item.label : undefined}
                        className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                            isActive(item.href)
                                ? "brand-button-primary text-white"
                                : "text-slate-400 hover:bg-white/5 hover:text-white"
                        } ${collapsed ? "!justify-center" : "!justify-start"}`}
                    >
                        {item.icon}
                        {!collapsed && item.label}
                    </Link>
                )))}
            </nav>

            {/* Footer: profile + logout */}
            <div className="border-t border-white/10 p-2 space-y-1">
                <Link
                    href="/dashboard/profile"
                    replace
                    aria-current={pathname === "/dashboard/profile" ? "page" : undefined}
                    title={collapsed ? "Profile" : undefined}
                    className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                        pathname === "/dashboard/profile"
                            ? "brand-button-primary text-white"
                            : "text-slate-400 hover:bg-white/5 hover:text-white"
                    } ${collapsed ? "!justify-center" : "!justify-start"}`}
                >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-white shrink-0">
                        {userInitials}
                    </div>
                    {!collapsed && <span className="truncate">{user?.email || "Profile"}</span>}
                </Link>
                <button
                    onClick={logout}
                    title={collapsed ? "Sign out" : undefined}
                    className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                        collapsed ? "justify-center" : ""
                    }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    {!collapsed && "Sign out"}
                </button>
            </div>
        </aside>
    );
}
