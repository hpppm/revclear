"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { apiClient } from "@/app/lib/api/apiClient";

const LOGO_FULL = "/revclear-logo/vector/default.svg";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState<"request" | "confirm">("request");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [logoError, setLogoError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRequest = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    setLoading(true);
    try {
      await apiClient.auth.forgotPassword(email.trim());
      setStep("confirm");
      setSuccess("Verification code sent to your email.");
    } catch (error: unknown) {
      const responseData = typeof error === "object" && error !== null && "response" in error
        ? (error as { response?: { data?: { error?: string; message?: string } } }).response?.data
        : undefined;
      setError(responseData?.error || responseData?.message || "Failed to send code.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!code.trim() || !newPassword.trim()) {
      setError("Code and new password are required.");
      return;
    }
    setLoading(true);
    try {
      await apiClient.auth.confirmForgotPassword({
        email: email.trim(),
        code: code.trim(),
        newPassword: newPassword.trim(),
      });
      setSuccess("Password updated. You can sign in now.");
    } catch (error: unknown) {
      const responseData = typeof error === "object" && error !== null && "response" in error
        ? (error as { response?: { data?: { error?: string; message?: string } } }).response?.data
        : undefined;
      setError(responseData?.error || responseData?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center rc-app-shell px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/landing" className="inline-flex items-center gap-3">
            {!logoError ? (
              <Image
                src={LOGO_FULL}
                alt="RevClear"
                width={160}
                height={40}
                className="h-10 w-auto object-contain rc-logo-hover rc-logo-float"
                onError={() => setLogoError(true)}
                priority
              />
            ) : (
              <span className="text-2xl font-semibold text-slate-900">RevClear</span>
            )}
          </Link>
        </div>

        <div className="rc-card rounded-2xl p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold text-slate-900">
              {step === "request" ? "Reset your password" : "Enter verification code"}
            </h1>
            <p className="text-slate-500 mt-2">
              {step === "request"
                ? "We will email you a verification code."
                : "Use the code from your email to set a new password."}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-600 mb-4">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-sm text-emerald-700 mb-4">
              {success}
            </div>
          )}

          {step === "request" ? (
            <form className="space-y-4" onSubmit={handleRequest}>
              <div>
                <label className="block text-sm font-semibold text-slate-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-3 outline-none transition-all focus:border-slate-400 focus:ring-2 focus:ring-slate-200 placeholder:text-slate-400"
                  placeholder="you@example.com"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 text-white font-semibold py-3.5 rounded-xl shadow-md hover:bg-slate-800 disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send code"}
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleConfirm}>
              <div>
                <label className="block text-sm font-semibold text-slate-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-3 outline-none transition-all focus:border-slate-400 focus:ring-2 focus:ring-slate-200 placeholder:text-slate-400"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700">Verification code</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-3 outline-none transition-all focus:border-slate-400 focus:ring-2 focus:ring-slate-200 placeholder:text-slate-400"
                  placeholder="6-digit code"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700">New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-3 outline-none transition-all focus:border-slate-400 focus:ring-2 focus:ring-slate-200 placeholder:text-slate-400"
                  placeholder="Create a new password"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 text-white font-semibold py-3.5 rounded-xl shadow-md hover:bg-slate-800 disabled:opacity-50"
              >
                {loading ? "Updating..." : "Update password"}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm">
            <Link href="/login" className="font-semibold text-slate-900 hover:text-slate-700">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
