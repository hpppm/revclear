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
    primary: "brand-button-primary disabled:opacity-40 disabled:cursor-not-allowed",
    secondary: "brand-button-secondary",
    danger: "bg-[var(--rc-rose)] text-white hover:bg-[var(--rc-rose-dim)] disabled:opacity-40",
    ghost: "brand-button-ghost",
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
            className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
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
