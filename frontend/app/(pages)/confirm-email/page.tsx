"use client";

import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/app/lib/api/apiClient";
import { invalidateDedupeCache } from "@/app/lib/api/deduplicate";
import { useAuth } from "@/app/context/AuthContext";
import { BrandMark } from "@/app/components/ui/BrandMark";
import Button from "@/app/components/ui/Button";

const RESEND_COOLDOWN_S = 60;

function getApiError(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const data = (error as any)?.response?.data;
  return typeof data?.error === "string" ? data.error : undefined;
}

function ConfirmEmailPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();

  const email = params.get("email") ?? "";
  const showUnverifiedBanner = params.get("banner") === "unverified";
  const source = params.get("source");
  const allowResend = source === "signup";

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [formError, setFormError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const code = digits.join("");
  const isComplete = code.length === 6 && /^\d{6}$/.test(code);

  function handleDigitChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      e.preventDefault();
      setDigits(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isComplete || !email) return;
    setFormError("");
    setIsLoading(true);
    try {
      const res = await apiClient.auth.verifyOtp({ email, code });
      const data = res.data;

      if (data?.step === "complete") {
        invalidateDedupeCache("me.getProfile");
        const userRes = await apiClient.me.getProfile();
        login(userRes.data);
        router.push("/dashboard");
        return;
      }

      router.push(`/login?mfa=1&email=${encodeURIComponent(email)}&challenge=${data?.challengeName ?? "SOFTWARE_TOKEN_MFA"}`);
    } catch (error: unknown) {
      setFormError(getApiError(error) ?? "Invalid or expired code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || !email) return;
    setFormError("");
    try {
      await apiClient.auth.resendOtp({ email });
      setCooldown(RESEND_COOLDOWN_S);
    } catch (error: unknown) {
      setFormError(getApiError(error) ?? "Could not resend code. Please try again.");
    }
  }

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--brand-50)] via-[#f4fffd] to-[var(--brand-100)] px-4 py-12 font-sans">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <p className="text-gray-500 text-sm mb-4">Session expired.</p>
            <Link href="/login" className="text-sm font-medium text-[var(--brand-600)] hover:text-[var(--brand-700)]">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--brand-50)] via-[#f4fffd] to-[var(--brand-100)] px-4 py-12 font-sans">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2">
              <Link href="/landing" className="cursor-pointer transition-transform hover:scale-105">
                <BrandMark size="md" className="shadow-[0_10px_20px_-12px_rgba(13,148,136,0.45)]" />
              </Link>
              <span className="text-2xl font-bold text-[var(--brand-600)]">RevClear</span>
            </div>
          </div>

          {showUnverifiedBanner && (
            <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
              <p className="text-sm text-amber-800">
                You need to confirm your email before signing in. We resent your confirmation code.
              </p>
            </div>
          )}

          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-50)]">
              <svg className="h-7 w-7 text-[var(--brand-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[var(--brand-600)] mb-1">Confirm your email</h1>
            <p className="text-sm text-gray-500">
              We sent a 6-digit code to <span className="font-medium text-gray-700">{email}</span>. Enter it below to activate your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                Confirmation code
              </label>
              <div className="flex justify-center gap-2">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={i === 0 ? handlePaste : undefined}
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    className="w-11 h-14 text-center text-xl font-bold rounded-xl border-2 border-gray-200 text-gray-800 focus:border-[var(--brand-500)] focus:outline-none transition-colors"
                    aria-label={`Digit ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            {formError && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                <p className="text-sm text-red-600 flex items-center gap-2">
                  <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {formError}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={isLoading}
                disabled={!isComplete}
                className="w-full rounded-xl hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[var(--brand-500)] disabled:hover:translate-y-0"
              >
                Activate account
              </Button>

              {allowResend && (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0}
                  className="w-full text-center text-sm text-gray-500 hover:text-[var(--brand-600)] disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                >
                  {cooldown > 0
                    ? `Resend code in ${cooldown}s`
                    : "Didn't receive it? Resend code"}
                </button>
              )}

              <button
                type="button"
                onClick={() => router.push("/login")}
                className="w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Back to sign in
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense>
      <ConfirmEmailPageInner />
    </Suspense>
  );
}
