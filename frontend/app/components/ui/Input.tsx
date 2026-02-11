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

    const baseClasses = "w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:ring-1 focus:ring-teal-200";
    const errorClasses = error ? "border-red-300 focus:border-red-500 focus:ring-red-200" : "border-slate-300";

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
        <label className="space-y-1 block">
            {label && <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</span>}
            {renderInput()}
            {helperText && !error && <p className="text-xs text-slate-500">{helperText}</p>}
            {error && <p className="text-xs text-red-600">{error}</p>}
        </label>
    );
}
