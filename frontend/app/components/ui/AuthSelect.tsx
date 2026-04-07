import React from "react";

interface Option {
  value: string;
  label: string;
  className?: string;
  disabled?: boolean;
}

interface AuthSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: Option[];
}

const baseClasses =
  "brand-input w-full rounded-lg px-4 py-3 outline-none transition appearance-none";

export default function AuthSelect({
  options,
  className = "",
  ...props
}: AuthSelectProps) {
  return (
    <select {...props} className={`${baseClasses} ${className}`}>
      {options.map((option) => (
        <option
          key={option.value}
          value={option.value}
          className={option.className}
          disabled={option.disabled}
        >
          {option.label}
        </option>
      ))}
    </select>
  );
}
