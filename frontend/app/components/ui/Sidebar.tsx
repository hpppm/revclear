"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
        label: "Encounters",
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
};

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const {
        canReadPatients,
        canManageClaims,
        canManageOrganization,
        canManageEncounters,
    } = useAuthorization();

    const isActive = (href: string) => {
        if (href === "/dashboard") return pathname === "/dashboard";
        return pathname.startsWith(href);
    };

    const userInitials = user?.email
        ? user.email.slice(0, 2).toUpperCase()
        : "RC";

    return (
        <aside
            className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-slate-900 text-white transition-all duration-300 ${
                collapsed ? "w-16" : "w-60"
            }`}
        >
            {/* Header: logo + hamburger */}
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-3">
                {!collapsed && (
                    <div className="flex items-center gap-3">
                        <BrandMark
                            label="RC"
                            size="sm"
                            className="rounded-lg"
                            labelClassName="text-sm tracking-tight"
                        />
                        <span className="text-base font-semibold tracking-tight">RevClear</span>
                    </div>
                )}
                <button
                    onClick={onToggle}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors ${
                        collapsed ? "mx-auto" : ""
                    }`}
                    aria-label="Toggle sidebar"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
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
                        className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-colors ${
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
                    className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-colors ${
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
                    className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-colors ${
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
