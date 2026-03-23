import React from "react";

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  rightElement?: React.ReactNode;
  containerClassName?: string;
}

const baseClasses =
  "brand-input w-full rounded-lg px-4 py-3 font-mono text-sm outline-none transition";

export default function AuthInput({
  rightElement,
  className = "",
  containerClassName = "",
  ...props
}: AuthInputProps) {
  if (rightElement) {
    return (
      <div className={`relative ${containerClassName}`}>
        <input {...props} className={`${baseClasses} pr-12 ${className}`} />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {rightElement}
        </div>
      </div>
    );
  }

  return <input {...props} className={`${baseClasses} ${className}`} />;
}
