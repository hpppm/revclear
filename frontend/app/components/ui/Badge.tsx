import React from "react";

type BadgeVariant = "success" | "warning" | "error" | "info" | "neutral";
type BadgeSize = "sm" | "md" | "lg";

interface BadgeProps {
    variant?: BadgeVariant;
    size?: BadgeSize;
    children: React.ReactNode;
    className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
    success: "bg-[var(--rc-teal-glow)] text-[var(--rc-teal)] badge-glow-teal",
    warning: "bg-[var(--rc-amber-glow)] text-[var(--rc-amber)] badge-glow-amber",
    error: "bg-[var(--rc-rose-glow)] text-[var(--rc-rose)] badge-glow-rose",
    info: "bg-blue-500/15 text-blue-400 badge-glow-blue",
    neutral: "bg-white/5 text-[var(--rc-text-muted)] badge-glow-slate",
};

const sizeClasses: Record<BadgeSize, string> = {
    sm: "px-2.5 py-0.5 text-[11px]",
    md: "px-3 py-1 text-xs",
    lg: "px-4 py-1.5 text-sm",
};

export default function Badge({ variant = "neutral", size = "md", children, className = "" }: BadgeProps) {
    return (
        <span className={`inline-flex items-center rounded-full font-mono font-medium tracking-wide ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
            {children}
        </span>
    );
}
