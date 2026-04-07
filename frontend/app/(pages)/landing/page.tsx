"use client";

import Link from "next/link";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import { BrandMark } from "@/app/components/ui/BrandMark";

const display = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const features = [
  {
    title: "Voice-to-Text Transcription",
    description:
      "Capture visit audio and generate clear transcripts built for clinical review.",
  },
  {
    title: "AI-Generated SOAP Notes",
    description:
      "Convert transcripts into structured SOAP notes with clinician oversight.",
  },
  {
    title: "Claims-Ready Billing",
    description:
      "Create accurate claims with ICD and CPT codes from each encounter.",
  },
  {
    title: "Security & Compliance",
    description:
      "HIPAA-aligned security with encryption, audit logging, and role-based access.",
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
const featureAccents = ["teal", "teal", "orange", "pink"];

export default function LandingPage() {
  return (
    <div className={`${body.className} min-h-screen bg-slate-50 text-slate-900`}>
      <div className="relative overflow-hidden">
        <div className="absolute -top-40 -right-32 h-80 w-80 rounded-full bg-teal-200/50 blur-3xl" />
        <div className="absolute top-20 -left-20 h-72 w-72 rounded-full bg-orange-200/40 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.04),transparent_55%)]" />

        <header className="sticky top-0 z-30 border-b border-white/20 bg-white/70 backdrop-blur">
          <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <BrandMark size="md" />
              <span className={`${display.className} text-2xl font-semibold`}>RevClear</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="brand-button-secondary rounded-lg px-5 py-2.5 font-semibold shadow-sm transition-all duration-200"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="brand-button-primary rounded-lg px-5 py-2.5 font-semibold shadow-sm transition-all duration-200"
              >
                Get Started
              </Link>
            </div>
          </nav>
        </header>

        <main className="max-w-7xl mx-auto px-6 pt-16 pb-20">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
            <div>
              <h1
                className={`${display.className} text-5xl md:text-6xl font-semibold leading-tight tracking-tight`}
              >
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
                <span className="block text-teal-600">
                  {["Clinical", "Workflow"].map((word, index) => (
                    <span
                      key={word}
                      className="inline-block animate-wordReveal"
                      style={{ animationDelay: `${(index + 2) * 140}ms` }}
                    >
                      {word}
                    </span>
                  ))}
                </span>
              </h1>
              <p className="text-lg text-slate-600 mt-6 max-w-2xl">
                RevClear is an AI-assisted medical claims and speech transcription platform for secure
                healthcare billing workflows. Capture visits, generate SOAP notes, and submit accurate
                claims while clinicians stay in control.
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-8">
                {specialties.map((specialty) => (
                  <div
                    key={specialty}
                    className="px-4 py-2 bg-teal-50 border border-teal-200 rounded-full text-teal-700 text-sm font-medium shadow-sm"
                  >
                    {specialty}
                  </div>
                ))}
              </div>

            </div>

            <div className="space-y-6">
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xl p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Live Workflow</p>
                <h3 className={`${display.className} text-2xl font-semibold mt-2`}>
                  Documentation and billing, in one view.
                </h3>
                <div className="mt-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-semibold">
                      1
                    </div>
                    <div>
                      <p className="font-semibold">Transcribe encounter</p>
                      <p className="text-sm text-slate-600">Record the visit and receive a full transcript.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-semibold">
                      2
                    </div>
                    <div>
                      <p className="font-semibold">Generate SOAP + codes</p>
                      <p className="text-sm text-slate-600">AI drafts SOAP notes and suggests ICD/CPT codes.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-semibold">
                      3
                    </div>
                    <div>
                      <p className="font-semibold">Submit clean claim</p>
                      <p className="text-sm text-slate-600">Finalize and send accurate claims to payers.</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <section className="mt-20">
            <div className="flex items-end justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-teal-600">Core Capabilities</p>
                <h2 className={`${display.className} text-3xl font-semibold mt-3`}>
                  Purpose-built for clinical and billing teams
                </h2>
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className={`p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all border-t-4 ${featureAccents[index % featureAccents.length] === "teal"
                    ? "border-t-teal-300 hover:border-teal-200"
                    : featureAccents[index % featureAccents.length] === "blue"
                      ? "border-t-teal-300 hover:border-teal-200"
                      : featureAccents[index % featureAccents.length] === "orange"
                        ? "border-t-orange-300 hover:border-orange-200"
                        : "border-t-pink-200 hover:border-pink-200"
                    }`}
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-2">
                    Feature
                  </p>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-20 grid lg:grid-cols-[0.9fr_1.1fr] gap-10 items-center">
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <p className="text-sm uppercase tracking-[0.18em] text-teal-600">Workflow</p>
              <h2 className={`${display.className} text-3xl font-semibold mt-3`}>From recording to reimbursement</h2>
              <p className="text-slate-600 mt-4">
                Align documentation, coding, and claims in a single workflow from intake to reimbursement.
              </p>
            </div>
            <div className="grid gap-4">
              {steps.map((step, index) => (
                <div
                  key={step.title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 flex items-start gap-4 border-l-4 border-l-teal-200"
                >
                  <div className="h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{step.title}</p>
                    <p className="text-sm text-slate-600 mt-1">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>

      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <BrandMark size="sm" />
            <span className={`${display.className} text-xl font-semibold`}>RevClear</span>
          </div>
          <p className="text-slate-500 text-sm">© 2026 RevClear. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="text-slate-500 hover:text-teal-600 text-sm transition-colors">Privacy Policy</a>
            <a href="#" className="text-slate-500 hover:text-teal-600 text-sm transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @media (prefers-reduced-motion: no-preference) {
          main {
            animation: fadeUp 0.7s ease-out;
          }
        }
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes wordReveal {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-wordReveal {
          opacity: 0;
          animation: wordReveal 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
