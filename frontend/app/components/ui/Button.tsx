import React from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-300",
    secondary: "bg-white text-slate-800 border border-slate-200 hover:border-blue-500",
    danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-slate-300",
    ghost: "bg-transparent text-blue-600 hover:bg-blue-50",
};

const sizeClasses: Record<ButtonSize, string> = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
};

export default function Button({
    variant = "primary",
    size = "md",
    loading = false,
    disabled,
    className = "",
    children,
    ...props
}: ButtonProps) {
    return (
        <button
            className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold shadow-sm transition disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
            disabled={disabled || loading}
            {...props}
        >
            {loading && (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-b-transparent" />
            )}
            {children}
        </button>
    );
}
