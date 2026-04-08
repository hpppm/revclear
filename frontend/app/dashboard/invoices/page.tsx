"use client";

import Link from "next/link";

export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Invoices</p>
        <h1 className="text-2xl font-semibold text-slate-900">Invoices</h1>
        <p className="text-sm text-slate-600">
          Invoices will appear here once billing exports are generated.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/90 p-6">
        <p className="text-sm text-slate-600">
          No invoices yet. When you submit claims and receive remits, invoices will show up here.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/dashboard/claims"
            className="rounded-2xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600"
          >
            Go to claims
          </Link>
        </div>
      </div>
    </div>
  );
}
