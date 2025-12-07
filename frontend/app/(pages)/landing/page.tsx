"use client";

import Link from "next/link";
import { useState } from "react";

export default function LandingPage() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  const features = [
    {
      icon: "🎙️",
      title: "Voice-to-Text Transcription",
      description: "Record patient sessions and get instant, accurate transcriptions powered by advanced AI."
    },
    {
      icon: "📝",
      title: "AI-Generated SOAP Notes",
      description: "Automatically generate structured clinical documentation from your transcripts in seconds."
    },
    {
      icon: "💰",
      title: "Automated Medical Billing",
      description: "Generate accurate claims with proper ICD and CPT codes for seamless insurance processing."
    },
    {
      icon: "🔒",
      title: "HIPAA Compliant & Secure",
      description: "Enterprise-grade security with encryption, audit trails, and complete data protection."
    }
  ];

  const specialties = ["Mental Health", "Speech Therapy", "Physical Therapy"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)] animate-pulse" />

      {/* Header */}
      <header className="relative z-10 px-6 py-6">
        <nav className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/50">
              <span className="text-white font-bold text-xl">R</span>
            </div>
            <span className="text-2xl font-bold text-white">RevClear</span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="px-5 py-2.5 text-white/90 hover:text-white font-medium transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 transition-all duration-200"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 px-6 pt-20 pb-32">
        <div className="max-w-7xl mx-auto">
          {/* Hero Content */}
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-400/20 rounded-full mb-8 backdrop-blur-sm">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-blue-300 text-sm font-medium">AI-Powered Healthcare Documentation</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Transform Your
              <span className="block bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent animate-gradient">
                Clinical Workflow
              </span>
            </h1>

            <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-12 leading-relaxed">
              Automate medical documentation and billing with AI. Record sessions, generate SOAP notes,
              and create accurate claims, all in one seamless platform built for outpatient clinics.
            </p>

            {/* Specialty Pills */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
              <span className="text-slate-400 text-sm font-medium">Trusted by:</span>
              {specialties.map((specialty) => (
                <div
                  key={specialty}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-slate-300 text-sm font-medium backdrop-blur-sm hover:bg-white/10 transition-colors"
                >
                  {specialty}
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="group px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-semibold rounded-xl shadow-2xl shadow-blue-500/40 hover:shadow-blue-500/60 hover:scale-105 transition-all duration-300 flex items-center gap-2"
              >
                Create Free Account
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>

              <Link
                href="/login"
                className="px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 text-white font-semibold rounded-xl hover:bg-white/20 transition-all duration-300"
              >
                Sign In
              </Link>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {features.map((feature, index) => (
              <div
                key={index}
                onMouseEnter={() => setHoveredFeature(index)}
                onMouseLeave={() => setHoveredFeature(null)}
                className={`p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl transition-all duration-300 ${hoveredFeature === index
                  ? 'bg-white/10 border-blue-400/50 shadow-xl shadow-blue-500/20 scale-105'
                  : 'hover:bg-white/8'
                  }`}
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Stats Section */}
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { value: "90%", label: "Time Saved on Documentation" },
              { value: "99%", label: "Billing Accuracy" },
              { value: "100%", label: "HIPAA Compliant" }
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-slate-400 text-sm font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-slate-400 text-sm">
          <p>© 2025 RevClear. All rights reserved. HIPAA compliant healthcare documentation platform.</p>
        </div>
      </footer>

      <style jsx>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
}
