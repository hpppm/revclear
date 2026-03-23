import React from "react";

interface BaseInputProps {
    label?: string;
    helperText?: string;
    error?: string;
    className?: string;
}

interface TextInputProps extends BaseInputProps, React.InputHTMLAttributes<HTMLInputElement> {
    variant?: "text";
}

interface TextareaInputProps extends BaseInputProps, React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    variant: "textarea";
}

interface SelectInputProps extends BaseInputProps, React.SelectHTMLAttributes<HTMLSelectElement> {
    variant: "select";
    options?: { value: string; label: string }[];
}

type InputProps = TextInputProps | TextareaInputProps | SelectInputProps;

export default function Input(props: InputProps) {
    const { label, helperText, error, className = "", variant = "text", ...rest } = props;

    const baseClasses = "brand-input w-full rounded-lg border px-3 py-2 text-sm shadow-sm font-mono";
    const errorClasses = error
        ? "border-[var(--rc-rose)] focus:border-[var(--rc-rose)] focus:ring-[var(--rc-rose-glow)]"
        : "";

    const renderInput = () => {
        if (variant === "textarea") {
            const textareaProps = rest as Omit<TextareaInputProps, 'variant' | 'label' | 'helperText' | 'error' | 'className'>;
            return <textarea className={`${baseClasses} ${errorClasses} ${className}`} {...textareaProps} />;
        }

        if (variant === "select") {
            const { options = [], ...selectProps } = rest as SelectInputProps;
            return (
                <select className={`${baseClasses} ${errorClasses} ${className}`} {...selectProps}>
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            );
        }

        const inputProps = rest as Omit<TextInputProps, 'variant' | 'label' | 'helperText' | 'error' | 'className'>;
        return <input type="text" className={`${baseClasses} ${errorClasses} ${className}`} {...inputProps} />;
    };

    return (
        <label className="space-y-1.5 block">
            {label && (
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--rc-text-secondary)' }}>
                    {label}
                </span>
            )}
            {renderInput()}
            {helperText && !error && <p className="text-xs" style={{ color: 'var(--rc-text-muted)' }}>{helperText}</p>}
            {error && <p className="text-xs" style={{ color: 'var(--rc-rose)' }}>{error}</p>}
        </label>
    );
}
