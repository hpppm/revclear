"use client";

import { useEffect, useRef, useState } from "react";
import { apiClient } from "@/app/lib/api/apiClient";

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

interface ApiErrorShape {
  response?: { data?: { error?: string; errors?: { message: string }[] } };
}

function getApiError(err: unknown): string | undefined {
  const e = err as ApiErrorShape;
  return (
    e?.response?.data?.error ??
    e?.response?.data?.errors?.[0]?.message
  );
}

export default function MFAChallenge({ onSuccess, onCancel }: Props) {
  const [totpCode, setTotpCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (totpCode.length !== 6) return;
    setErrorMsg("");
    setIsSubmitting(true);
    try {
      await apiClient.auth.confirmTotpCode({ totpCode });
      onSuccess();
    } catch (err: unknown) {
      setErrorMsg(getApiError(err) ?? "Invalid code. Please try again.");
      setIsSubmitting(false);
      setTotpCode("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  function handleCodeInput(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 6);
    setTotpCode(digits);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--brand-50)] via-[#f4fffd] to-[var(--brand-100)] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header band */}
          <div className="bg-[var(--brand-600)] px-8 py-5 text-white">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-9 h-9 rounded-full bg-white/20">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </span>
              <div>
                <h1 className="text-lg font-bold leading-tight">Two-factor authentication</h1>
                <p className="text-sm text-white/75">Open your authenticator app</p>
              </div>
            </div>
          </div>

          <div className="px-8 py-6 space-y-5">
            <p className="text-sm text-gray-500 text-center">
              Enter the 6-digit code from your authenticator app to complete sign-in.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={totpCode}
                  onChange={(e) => handleCodeInput(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  disabled={isSubmitting}
                  className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-[var(--brand-500)] focus:ring-2 focus:ring-[var(--brand-200)] outline-none text-center text-3xl tracking-[0.6em] font-mono text-gray-800 disabled:opacity-50 transition"
                />
              </div>

              {errorMsg && (
                <p className="text-sm text-red-600 flex items-center justify-center gap-1.5">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={totpCode.length !== 6 || isSubmitting}
                className="w-full py-3 rounded-xl bg-[var(--brand-600)] text-white font-semibold hover:bg-[var(--brand-700)] disabled:opacity-50 disabled:cursor-not-allowed transition hover:-translate-y-0.5 disabled:hover:translate-y-0 focus-visible:ring-2 focus-visible:ring-[var(--brand-500)]"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Verifying…
                  </span>
                ) : (
                  "Verify"
                )}
              </button>
            </form>

            <div className="text-center">
              <button
                type="button"
                onClick={onCancel}
                className="text-sm text-gray-400 hover:text-gray-600 transition"
              >
                ← Back to sign in
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
