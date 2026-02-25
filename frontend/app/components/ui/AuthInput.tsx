import React from "react";

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  rightElement?: React.ReactNode;
  containerClassName?: string;
}

const baseClasses =
  "w-full bg-[#f9fafb] border border-[#e5e7eb] text-[#4f46e5] rounded-lg px-4 py-3 outline-none transition focus:border-[#4f46e5] focus:ring-2 focus:ring-[rgba(79,70,229,0.2)] placeholder:text-[#c4c9d1]";

export default function AuthInput({
  rightElement,
  className = "",
  containerClassName = "",
  ...props
}: AuthInputProps) {
  if (rightElement) {
    return (
      <div className={`relative ${containerClassName}`}>
        <input
          {...props}
          className={`${baseClasses} pr-12 ${className}`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {rightElement}
        </div>
      </div>
    );
  }

  return <input {...props} className={`${baseClasses} ${className}`} />;
}
