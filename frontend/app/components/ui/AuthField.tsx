import React from "react";

interface AuthFieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export default function AuthField({
  label,
  required,
  children,
  className = "",
}: AuthFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-semibold text-[#374151]">
        {label}
        {required ? " *" : ""}
      </label>
      {children}
    </div>
  );
}
