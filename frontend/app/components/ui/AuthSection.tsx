import React from "react";

interface AuthSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export default function AuthSection({
  title,
  children,
  className = "",
}: AuthSectionProps) {
  return (
    <section className={`space-y-4 ${className}`}>
      {title ? (
        <h2 className="text-sm font-semibold tracking-wide text-[var(--brand-600)] uppercase">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}
