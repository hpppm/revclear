"use client";

import React from "react";
import Link from "next/link";

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  backLink?: string;
  actions?: React.ReactNode;
}

export default function DashboardHeader({
  title,
  subtitle,
  backLink,
  actions,
}: DashboardHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {backLink && (
            <Link
              href={backLink}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--rc-text-muted)' }}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
          )}
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--rc-text-primary)' }}>{title}</h1>
            {subtitle && (
              <p className="text-sm mt-1" style={{ color: 'var(--rc-text-muted)' }}>{subtitle}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}
