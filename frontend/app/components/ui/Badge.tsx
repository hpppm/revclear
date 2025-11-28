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
    success: "bg-green-100 text-green-800",
    warning: "bg-amber-100 text-amber-800",
    error: "bg-red-100 text-red-800",
    info: "bg-blue-100 text-blue-800",
    neutral: "bg-slate-100 text-slate-700",
};

const sizeClasses: Record<BadgeSize, string> = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base",
};

export default function Badge({ variant = "neutral", size = "md", children, className = "" }: BadgeProps) {
    return (
        <span className={`inline-flex items-center rounded-full font-semibold ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
            {children}
        </span>
    );
}
