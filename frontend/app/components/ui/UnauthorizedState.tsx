"use client";

import Link from "next/link";

type UnauthorizedStateProps = {
  title?: string;
  message?: string;
  href?: string;
  ctaLabel?: string;
};

export default function UnauthorizedState({
  title = "Access restricted",
  message = "Your role does not have access to this page.",
  href = "/dashboard",
  ctaLabel = "Back to Dashboard",
}: UnauthorizedStateProps) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-center">
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-600">{message}</p>
      <Link
        href={href}
        className="brand-button-primary mt-6 inline-flex rounded-lg px-4 py-2 text-sm font-semibold"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
