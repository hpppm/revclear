"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { apiClient } from "@/app/lib/api/apiClient";

interface Props {
  onSuccess: () => void;
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

type SetupState = "loading" | "ready" | "confirming" | "success" | "error";

export default function MFASetup({ onSuccess }: Props) {
  const [state, setState] = useState<SetupState>("loading");
  const [secretCode, setSecretCode] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [userCode, setUserCode] = useState("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [showSecret, setShowSecret] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Guard against React 18 Strict Mode double-invocation: useEffect fires
  // mount→unmount→remount in development. Without this ref, the second call
  // hits AssociateSoftwareToken with an already-advanced Cognito session and
  // gets NotAuthorizedException — corrupting the mfaSession cookie.
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    apiClient.auth.totpSetup()
      .then((res) => {
        setSecretCode(res.data.secretCode as string);
        setUsername(res.data.username as string);
        setState("ready");
      })
      .catch(() => {
        setErrorMsg("Failed to load QR code. Please sign in again.");
        setState("error");
      });
  }, []);

  useEffect(() => {
    if (state === "ready") {
      inputRef.current?.focus();
    }
  }, [state]);

  const otpauthUrl =
    secretCode && username
      ? `otpauth://totp/RevClear:${encodeURIComponent(username)}?secret=${secretCode}&issuer=RevClear`
      : "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (userCode.length !== 6) return;
    setErrorMsg("");
    setState("confirming");
    try {
      await apiClient.auth.confirmTotpSetup({ userCode });
      // Setup complete — but the returned tokens lack amr:"mfa", so the user
      // must sign in again with their TOTP code to get an MFA-satisfied session.
      // Show a brief success state then hand off to the parent to redirect.
      setState("success");
      setTimeout(() => onSuccess(), 1800);
    } catch (err: unknown) {
      setErrorMsg(getApiError(err) ?? "Invalid code. Please try again.");
      setState("ready");
      setUserCode("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  function handleCodeInput(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 6);
    setUserCode(digits);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--brand-50)] via-[#f4fffd] to-[var(--brand-100)] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header band */}
          <div className="bg-[var(--brand-600)] px-8 py-5 text-white">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-9 h-9 rounded-full bg-white/20">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <div>
                <h1 className="text-lg font-bold leading-tight">Set up two-factor authentication</h1>
                <p className="text-sm text-white/75">Required for all RevClear accounts</p>
              </div>
            </div>
          </div>

          <div className="px-8 py-6 space-y-6">
            {state === "success" && (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <span className="flex items-center justify-center w-16 h-16 rounded-full bg-[var(--brand-50)] text-[var(--brand-600)]">
                  <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                <div>
                  <p className="text-base font-semibold text-gray-800">Authenticator connected!</p>
                  <p className="text-sm text-gray-500 mt-1">Sign in with your email and password — we'll ask for your authenticator code to complete sign-in.</p>
                </div>
              </div>
            )}

            {state === "loading" && (
              <div className="flex flex-col items-center gap-3 py-8 text-[var(--brand-600)]">
                <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <p className="text-sm text-gray-500">Loading QR code…</p>
              </div>
            )}

            {state === "error" && (
              <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-600">
                {errorMsg}
              </div>
            )}

            {(state === "ready" || state === "confirming") && (
              <>
                {/* Steps */}
                <ol className="space-y-1 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-[var(--brand-100)] text-[var(--brand-700)] text-xs font-bold">1</span>
                    Install an authenticator app (Google Authenticator, Authy, or 1Password).
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-[var(--brand-100)] text-[var(--brand-700)] text-xs font-bold">2</span>
                    Scan the QR code below with the app.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-[var(--brand-100)] text-[var(--brand-700)] text-xs font-bold">3</span>
                    Enter the 6-digit code shown in the app.
                  </li>
                </ol>

                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="p-3 rounded-xl border-2 border-[var(--brand-100)] bg-white shadow-sm">
                    <QRCodeSVG
                      value={otpauthUrl}
                      size={176}
                      level="M"
                      marginSize={1}
                      title="RevClear TOTP QR Code"
                    />
                  </div>
                </div>

                {/* Manual entry toggle */}
                <div className="text-center">
                  <button
                    type="button"
                    className="text-xs text-[var(--brand-600)] hover:text-[var(--brand-700)] underline underline-offset-2"
                    onClick={() => setShowSecret((p) => !p)}
                  >
                    {showSecret ? "Hide" : "Can't scan? Enter code manually"}
                  </button>
                  {showSecret && (
                    <p className="mt-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 font-mono text-sm text-gray-700 tracking-widest break-all select-all">
                      {secretCode}
                    </p>
                  )}
                </div>

                {/* Code input */}
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Verification code
                    </label>
                    <input
                      ref={inputRef}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={userCode}
                      onChange={(e) => handleCodeInput(e.target.value)}
                      placeholder="000000"
                      maxLength={6}
                      disabled={state === "confirming"}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--brand-500)] focus:ring-2 focus:ring-[var(--brand-200)] outline-none text-center text-2xl tracking-[0.5em] font-mono text-gray-800 disabled:opacity-50 transition"
                    />
                  </div>

                  {errorMsg && (
                    <p className="text-sm text-red-600 flex items-center gap-1.5">
                      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      {errorMsg}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={userCode.length !== 6 || state === "confirming"}
                    className="w-full py-3 rounded-xl bg-[var(--brand-600)] text-white font-semibold hover:bg-[var(--brand-700)] disabled:opacity-50 disabled:cursor-not-allowed transition hover:-translate-y-0.5 disabled:hover:translate-y-0 focus-visible:ring-2 focus-visible:ring-[var(--brand-500)]"
                  >
                    {state === "confirming" ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Verifying…
                      </span>
                    ) : (
                      "Activate two-factor authentication"
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
