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
        className="mt-0.5 h-4 w-4 rounded border border-[#14b8a6] text-[#14b8a6] focus:ring-2 focus:ring-[rgba(20,184,166,0.2)]"
        required={required}
      />
      <span>{label}</span>
    </label>
  );
}
