"use client";

import Link from "next/link";
import { BrandMark } from "@/app/components/ui/BrandMark";

const features = [
  {
    title: "Voice-to-Text Transcription",
    description:
      "Capture visit audio and generate clear transcripts built for clinical review.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
  },
  {
    title: "AI-Generated SOAP Notes",
    description:
      "Convert transcripts into structured SOAP notes with clinician oversight.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    title: "Claims-Ready Billing",
    description:
      "Create accurate claims with ICD and CPT codes from each encounter.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
      </svg>
    ),
  },
  {
    title: "Security & Compliance",
    description:
      "HIPAA-aligned security with encryption, audit logging, and role-based access.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
];

const steps = [
  {
    title: "Record",
    description: "Start an encounter and capture the visit audio.",
  },
  {
    title: "Review",
    description: "Confirm the transcript, SOAP note, and suggested codes.",
  },
  {
    title: "Submit",
    description: "Finalize the claim and move billing forward.",
  },
];

const specialties = ["Mental Health", "Speech Therapy", "Physical Therapy"];

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--rc-deep)', color: 'var(--rc-text-primary)' }}>
      {/* ─── Full-bleed gradient mesh hero ─── */}
      <div className="relative overflow-hidden gradient-mesh">
        {/* Subtle grain texture overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.5\'/%3E%3C/svg%3E")' }} />

        {/* Nav */}
        <header className="sticky top-0 z-30" style={{ borderBottom: '1px solid var(--rc-border)', background: 'rgba(15, 17, 23, 0.7)', backdropFilter: 'blur(12px)' }}>
          <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <BrandMark size="md" />
              <span className="text-xl font-semibold tracking-tight" style={{ color: 'var(--rc-text-primary)' }}>RevClear</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="brand-button-secondary rounded-lg px-5 py-2 text-sm font-semibold transition-all duration-200"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="brand-button-primary rounded-lg px-5 py-2 text-sm font-semibold transition-all duration-200"
              >
                Get Started
              </Link>
            </div>
          </nav>
        </header>

        {/* Hero */}
        <main className="max-w-7xl mx-auto px-6 pt-20 pb-24">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-16 items-center">
            {/* Left: Display type */}
            <div className="animate-revealUp">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-semibold leading-[1.08] tracking-tight">
                <span className="inline-flex flex-wrap gap-x-3">
                  {["Transform", "Your"].map((word, index) => (
                    <span
                      key={word}
                      className="inline-block animate-wordReveal"
                      style={{ animationDelay: `${index * 140}ms` }}
                    >
                      {word}
                    </span>
                  ))}
                </span>
                <span className="block" style={{ color: 'var(--rc-teal)' }}>
                  {["Clinical", "Workflow"].map((word, index) => (
                    <span
                      key={word}
                      className="inline-block animate-wordReveal mr-3"
                      style={{ animationDelay: `${(index + 2) * 140}ms` }}
                    >
                      {word}
                    </span>
                  ))}
                </span>
              </h1>
              <p className="text-lg mt-6 max-w-2xl leading-relaxed" style={{ color: 'var(--rc-text-secondary)' }}>
                RevClear is an AI-assisted medical claims and speech transcription platform for secure
                healthcare billing workflows. Capture visits, generate SOAP notes, and submit accurate
                claims while clinicians stay in control.
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-8">
                {specialties.map((specialty, i) => (
                  <div
                    key={specialty}
                    className="px-4 py-2 rounded-full text-xs font-mono tracking-wide animate-revealUp"
                    style={{
                      background: 'var(--rc-teal-glow)',
                      border: '1px solid rgba(0, 212, 184, 0.2)',
                      color: 'var(--rc-teal)',
                      animationDelay: `${600 + i * 100}ms`,
                    }}
                  >
                    {specialty}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Workflow preview card */}
            <div className="animate-revealUp stagger-3">
              <div className="glass-card rounded-2xl p-6">
                <p className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'var(--rc-text-faint)' }}>Live Workflow</p>
                <h3 className="text-xl font-semibold mt-2" style={{ color: 'var(--rc-text-primary)' }}>
                  Documentation and billing, in one view.
                </h3>
                <div className="mt-6 space-y-4">
                  {[
                    { num: "01", label: "Transcribe encounter", desc: "Record the visit and receive a full transcript." },
                    { num: "02", label: "Generate SOAP + codes", desc: "AI drafts SOAP notes and suggests ICD/CPT codes." },
                    { num: "03", label: "Submit clean claim", desc: "Finalize and send accurate claims to payers." },
                  ].map((item, idx) => (
                    <div key={item.num} className="flex items-start gap-4 animate-revealUp" style={{ animationDelay: `${400 + idx * 120}ms` }}>
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center font-mono text-sm font-medium shrink-0"
                        style={{
                          background: idx < 2 ? 'var(--rc-teal-glow)' : 'var(--rc-amber-glow)',
                          color: idx < 2 ? 'var(--rc-teal)' : 'var(--rc-amber)',
                          border: `1px solid ${idx < 2 ? 'rgba(0, 212, 184, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
                        }}
                      >
                        {item.num}
                      </div>
                      <div>
                        <p className="font-medium text-sm" style={{ color: 'var(--rc-text-primary)' }}>{item.label}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--rc-text-muted)' }}>{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ─── Features grid ─── */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-12">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'var(--rc-teal)' }}>Core Capabilities</p>
            <h2 className="text-3xl font-semibold mt-3 tracking-tight" style={{ color: 'var(--rc-text-primary)' }}>
              Purpose-built for clinical and billing teams
            </h2>
          </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="glass-card rounded-xl p-6 transition-all duration-300 hover:translate-y-[-2px] animate-revealUp"
              style={{
                borderLeft: '3px solid var(--rc-teal)',
                animationDelay: `${index * 80}ms`,
              }}
            >
              <div
                className="h-9 w-9 rounded-lg flex items-center justify-center mb-4"
                style={{ background: 'var(--rc-teal-glow)', color: 'var(--rc-teal)' }}
              >
                {feature.icon}
              </div>
              <p className="text-[11px] font-mono uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--rc-text-faint)' }}>
                Feature
              </p>
              <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--rc-text-primary)' }}>{feature.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--rc-text-muted)' }}>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Workflow steps ─── */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-10 items-center">
          <div className="glass-card rounded-xl p-8 animate-revealUp">
            <p className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'var(--rc-teal)' }}>Workflow</p>
            <h2 className="text-3xl font-semibold mt-3 tracking-tight" style={{ color: 'var(--rc-text-primary)' }}>From recording to reimbursement</h2>
            <p className="mt-4 leading-relaxed" style={{ color: 'var(--rc-text-secondary)' }}>
              Align documentation, coding, and claims in a single workflow from intake to reimbursement.
            </p>
          </div>
          <div className="grid gap-4">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="glass-card rounded-xl p-5 flex items-start gap-4 transition-all duration-300 hover:translate-x-1 animate-revealUp"
                style={{
                  borderLeft: '3px solid var(--rc-teal)',
                  animationDelay: `${100 + index * 100}ms`,
                }}
              >
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center font-mono text-sm font-medium shrink-0"
                  style={{ background: 'var(--rc-teal)', color: 'var(--rc-deep)' }}
                >
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div>
                  <p className="font-semibold" style={{ color: 'var(--rc-text-primary)' }}>{step.title}</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--rc-text-muted)' }}>{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer style={{ borderTop: '1px solid var(--rc-border)', background: 'var(--rc-deep)' }} className="py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <BrandMark size="sm" />
            <span className="text-lg font-semibold" style={{ color: 'var(--rc-text-primary)' }}>RevClear</span>
          </div>
          <p className="text-xs font-mono" style={{ color: 'var(--rc-text-faint)' }}>© 2026 RevClear. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="text-xs font-mono transition-colors" style={{ color: 'var(--rc-text-muted)' }}>Privacy Policy</a>
            <a href="#" className="text-xs font-mono transition-colors" style={{ color: 'var(--rc-text-muted)' }}>Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
