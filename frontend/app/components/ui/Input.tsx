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

function scrollToCenter(el: HTMLElement) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
}

export default function Input(props: InputProps) {
    const { label, helperText, error, className = "", variant = "text", ...rest } = props;

    const baseClasses = "brand-input w-full rounded-lg border px-3 py-2 text-slate-900 shadow-sm";
    const errorClasses = error ? "border-red-300 focus:border-red-500 focus:ring-red-100" : "border-slate-200";
    const errorAttr = error ? { "data-field-error": "true" } : {};

    const renderInput = () => {
        if (variant === "textarea") {
            const textareaProps = rest as Omit<TextareaInputProps, 'variant' | 'label' | 'helperText' | 'error' | 'className'>;
            const { onFocus, ...remainingTextarea } = textareaProps;
            return (
                <textarea
                    className={`${baseClasses} ${errorClasses} ${className}`}
                    onFocus={(e) => { scrollToCenter(e.currentTarget); onFocus?.(e); }}
                    {...errorAttr}
                    {...remainingTextarea}
                />
            );
        }

        if (variant === "select") {
            const { options = [], ...selectProps } = rest as SelectInputProps;
            const { onFocus, ...remainingSelect } = selectProps;
            return (
                <select
                    className={`${baseClasses} ${errorClasses} ${className}`}
                    onFocus={(e) => { scrollToCenter(e.currentTarget); onFocus?.(e); }}
                    {...errorAttr}
                    {...remainingSelect}
                >
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            );
        }

        const inputProps = rest as Omit<TextInputProps, 'variant' | 'label' | 'helperText' | 'error' | 'className'>;
        const { onFocus, ...remainingInput } = inputProps;
        return (
            <input
                type="text"
                className={`${baseClasses} ${errorClasses} ${className}`}
                onFocus={(e) => { scrollToCenter(e.currentTarget); onFocus?.(e); }}
                {...errorAttr}
                {...remainingInput}
            />
        );
    };

    const renderLabel = (text: string) => {
        if (text.endsWith(" *")) {
            return (
                <span className="text-sm font-medium text-slate-700">
                    {text.slice(0, -2)} <span className="text-red-500">*</span>
                </span>
            );
        }
        if (text.endsWith("*")) {
            return (
                <span className="text-sm font-medium text-slate-700">
                    {text.slice(0, -1)}<span className="text-red-500">*</span>
                </span>
            );
        }
        return <span className="text-sm font-medium text-slate-700">{text}</span>;
    };

    return (
        <label className="space-y-1 block">
            {label && renderLabel(label)}
            {renderInput()}
            {helperText && !error && <p className="text-xs text-slate-500">{helperText}</p>}
            {error && <p className="text-xs text-red-600">{error}</p>}
        </label>
    );
}
