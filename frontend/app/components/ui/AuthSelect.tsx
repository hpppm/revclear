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
  "w-full bg-[#f9fafb] border border-[#e5e7eb] text-[#4f46e5] rounded-lg px-4 py-3 outline-none transition focus:border-[#4f46e5] focus:ring-2 focus:ring-[rgba(79,70,229,0.2)] appearance-none";

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
