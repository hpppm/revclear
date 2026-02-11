"use client";

import Link from "next/link";
import { useState } from "react";

const LOGO_FULL = "/revclear-logo/vector/default.svg";

export default function LandingPage() {
  const [logoError, setLogoError] = useState(false);

  return (
    <div className="min-h-screen rc-app-shell">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            {!logoError ? (
            <img
              src={LOGO_FULL}
              alt="RevClear"
              className="h-12 w-auto object-contain rc-logo-hover rc-logo-float"
              onError={() => setLogoError(true)}
            />
            ) : (
              <span className="text-xl font-semibold text-slate-900">RevClear</span>
            )}
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-semibold text-slate-600 hover:text-slate-900"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Sign Up
            </Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12 animate-fadeIn">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Medical Billing Platform</p>
            <h1 className="text-4xl font-semibold text-slate-900 leading-tight">
              Professional billing workflows for modern clinics.
            </h1>
            <p className="text-lg text-slate-600">
              Manage encounters, documentation, and claims from one clinical-grade workspace.
              Built for accuracy, compliance, and faster reimbursements.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Create Workspace
              </Link>
              <Link
                href="/login"
                className="rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:border-slate-300"
              >
                Sign In
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rc-card rounded-lg p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Claim readiness</p>
                <p className="text-sm font-semibold text-slate-900 mt-2">Status-aware workflows</p>
              </div>
              <div className="rc-card rounded-lg p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Compliance</p>
                <p className="text-sm font-semibold text-slate-900 mt-2">Audit-ready records</p>
              </div>
              <div className="rc-card rounded-lg p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Efficiency</p>
                <p className="text-sm font-semibold text-slate-900 mt-2">Faster submissions</p>
              </div>
            </div>
          </div>

          <div className="rc-card rounded-lg p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Today</p>
            <h3 className="text-lg font-semibold text-slate-900 mt-2">Billing command center</h3>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded border border-slate-200 bg-white px-3 py-2 text-sm">
                <span className="text-slate-600">Draft encounters</span>
                <span className="font-semibold text-slate-900">8</span>
              </div>
              <div className="flex items-center justify-between rounded border border-slate-200 bg-white px-3 py-2 text-sm">
                <span className="text-slate-600">Ready to submit</span>
                <span className="font-semibold text-slate-900">3</span>
              </div>
              <div className="flex items-center justify-between rounded border border-slate-200 bg-white px-3 py-2 text-sm">
                <span className="text-slate-600">Claims this week</span>
                <span className="font-semibold text-slate-900">42</span>
              </div>
            </div>
            <div className="mt-5 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Login alerts highlight unfinished work so nothing is missed.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
