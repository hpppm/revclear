import React from "react";

interface AuthCheckboxProps {
  name: string;
  label: string;
  checked: boolean;
  required?: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function AuthCheckbox({
  name,
  label,
  checked,
  required,
  onChange,
}: AuthCheckboxProps) {
  return (
    <label className="flex items-start gap-3 text-sm text-[#374151]">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 rounded border border-[var(--brand-500)] text-[var(--brand-500)] focus:ring-2 focus:ring-[var(--brand-ring)]"
        required={required}
      />
      <span>{label}</span>
    </label>
  );
}
