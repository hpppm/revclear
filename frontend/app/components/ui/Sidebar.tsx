"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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

    const isActive = (href: string) => {
        if (href === "/dashboard") return pathname === "/dashboard";
        return pathname.startsWith(href);
    };

    const userInitials = user?.email
        ? user.email.slice(0, 2).toUpperCase()
        : "RC";

    return (
        <aside
            className={`fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-300 ${
                collapsed ? "w-16" : "w-60"
            }`}
            style={{ background: 'var(--rc-deep)', borderRight: '1px solid var(--rc-border)' }}
        >
            {/* Header: logo + hamburger */}
            <div className="flex h-14 items-center justify-between px-3" style={{ borderBottom: '1px solid var(--rc-border)' }}>
                {!collapsed && (
                    <div className="flex items-center gap-2.5">
                        <BrandMark
                            label="RC"
                            size="sm"
                            className="rounded-lg"
                            labelClassName="text-sm tracking-tight"
                        />
                        <span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--rc-text-primary)' }}>
                            RevClear
                        </span>
                    </div>
                )}
                <button
                    onClick={onToggle}
                    className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                        collapsed ? "mx-auto" : ""
                    }`}
                    style={{ color: 'var(--rc-text-muted)' }}
                    aria-label="Toggle sidebar"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
                {navItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            title={collapsed ? item.label : undefined}
                            className={`relative flex items-center gap-3 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors ${
                                collapsed ? "justify-center" : ""
                            }`}
                            style={{
                                color: active ? 'var(--rc-teal)' : 'var(--rc-text-muted)',
                                background: active ? 'var(--rc-teal-glow)' : 'transparent',
                                borderLeft: active ? '2px solid var(--rc-teal)' : '2px solid transparent',
                            }}
                        >
                            {item.icon}
                            {!collapsed && (
                                <span className="font-mono text-[13px] tracking-wide">
                                    {item.label}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer: profile + logout */}
            <div className="p-2 space-y-0.5" style={{ borderTop: '1px solid var(--rc-border)' }}>
                <Link
                    href="/dashboard/profile"
                    title={collapsed ? "Profile" : undefined}
                    className={`relative flex items-center gap-3 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors ${
                        collapsed ? "justify-center" : ""
                    }`}
                    style={{
                        color: pathname === "/dashboard/profile" ? 'var(--rc-teal)' : 'var(--rc-text-muted)',
                        background: pathname === "/dashboard/profile" ? 'var(--rc-teal-glow)' : 'transparent',
                        borderLeft: pathname === "/dashboard/profile" ? '2px solid var(--rc-teal)' : '2px solid transparent',
                    }}
                >
                    <div
                        className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold font-mono shrink-0"
                        style={{ background: 'var(--rc-elevated)', color: 'var(--rc-teal)', border: '1px solid var(--rc-border-active)' }}
                    >
                        {userInitials}
                    </div>
                    {!collapsed && <span className="truncate font-mono text-[12px]">{user?.email || "Profile"}</span>}
                </Link>
                <button
                    onClick={logout}
                    title={collapsed ? "Sign out" : undefined}
                    className={`flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors ${
                        collapsed ? "justify-center" : ""
                    }`}
                    style={{ color: 'var(--rc-text-muted)', borderLeft: '2px solid transparent' }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    {!collapsed && <span className="font-mono text-[13px]">Sign out</span>}
                </button>
            </div>
        </aside>
    );
}
