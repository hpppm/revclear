"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { apiClient } from "@/app/lib/api/apiClient";
import { invalidateDedupeCache } from "@/app/lib/api/deduplicate";
import { useAuth } from "@/app/context/AuthContext";
import { LoginFormSchema } from "@/app/lib/validation/schemas";
import logger from "@/app/lib/logger";
import AuthField from "@/app/components/ui/AuthField";
import AuthInput from "@/app/components/ui/AuthInput";
import AuthSection from "@/app/components/ui/AuthSection";
import { BrandMark } from "@/app/components/ui/BrandMark";
import Button from "@/app/components/ui/Button";

interface ApiErrorData {
  error?: string;
  message?: string;
  details?: string;
}

interface ApiErrorShape {
  response?: {
    data?: unknown;
  };
  message?: string;
  request?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getApiErrorData(error: unknown): ApiErrorData | undefined {
  if (!isRecord(error)) return undefined;
  const response = (error as ApiErrorShape).response;
  if (!response || !isRecord(response)) return undefined;
  const data = response.data;
  if (!isRecord(data)) return undefined;

  return {
    error: typeof data.error === "string" ? data.error : undefined,
    message: typeof data.message === "string" ? data.message : undefined,
    details: typeof data.details === "string" ? data.details : undefined,
  };
}

function isLikelyNetworkOrTlsFailure(error: unknown): boolean {
  if (!isRecord(error)) return false;

  const hasResponse = "response" in error && error.response !== undefined;
  if (hasResponse) return false;

  const message = typeof error.message === "string"
    ? error.message.toLowerCase()
    : "";

  if (
    message.includes("network") ||
    message.includes("failed to fetch") ||
    message.includes("ssl") ||
    message.includes("certificate") ||
    message.includes("cert")
  ) {
    return true;
  }

  // Axios/XHR failures usually include request but no response.
  return "request" in error && error.request !== undefined;
}

type FieldErrors = {
  email?: string;
  password?: string;
  form?: string;
};

interface MfaState {
  email: string;
  challengeName: "SOFTWARE_TOKEN_MFA" | "MFA_SETUP";
}

function LoginPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");

  const confirmedEmail = params.get("confirmed") === "1";
  const sessionExpired = params.get("reason") === "expired" || params.get("reason") === "idle";
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mfaState, setMfaState] = useState<MfaState | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [totpSecret, setTotpSecret] = useState<string | null>(null);

  const isFormInvalid = !email.trim() || !password.trim();
  const isMfaInvalid = mfaCode.length !== 6 || !/^\d{6}$/.test(mfaCode);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FieldErrors = {};
    const validation = LoginFormSchema.safeParse({ email, password });
    if (!validation.success) {
      validation.error.issues.forEach((err) => {
        const field = err.path[0] as keyof FieldErrors;
        if (field && !nextErrors[field]) nextErrors[field] = err.message;
      });
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length === 0) {
      setIsLoading(true);
      try {
        const signinResponse = await apiClient.auth.signin({ email, password });
        const data = signinResponse.data;

        if (data?.mfaRequired) {
          setMfaState({ email, challengeName: data.challengeName });
          return;
        }

        invalidateDedupeCache("me.getProfile");
        const userResponse = await apiClient.me.getProfile();
        const user = userResponse.data;

        login(user);
        router.push("/dashboard");
      } catch (error: unknown) {
        logger.error("Login failed");
        if (isLikelyNetworkOrTlsFailure(error)) {
          setErrors({
            form:
              "Secure connection to the API failed. Please try again in a minute. If this continues, contact support.",
          });
          return;
        }

        const errorData = getApiErrorData(error);
        const errorMessage =
          errorData?.error ||
          errorData?.details ||
          errorData?.message ||
          "Invalid email or password";
        setErrors({
          form: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    }
  }

  // Fetch TOTP secret when MFA_SETUP challenge starts
  useEffect(() => {
    if (mfaState?.challengeName !== "MFA_SETUP") return;
    apiClient.auth.associateTotp()
      .then((res) => setTotpSecret(res.data.secretCode))
      .catch((error: unknown) => {
        const errorData = getApiErrorData(error);
        setErrors({
          form:
            errorData?.error ||
            "Failed to start authenticator setup. Please sign in again.",
        });
      });
  }, [mfaState]);

  async function handleMfaSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mfaState || isMfaInvalid) return;

    setIsLoading(true);
    setErrors({});
    try {
      if (mfaState.challengeName === "MFA_SETUP") {
        await apiClient.auth.verifyTotpSetup({ email: mfaState.email, code: mfaCode });
      } else {
        await apiClient.auth.verifyMfa({ email: mfaState.email, code: mfaCode });
      }

      const userResponse = await apiClient.me.getProfile();
      const user = userResponse.data;

      login(user);
      router.push("/dashboard");
    } catch (error: unknown) {
      logger.error("MFA verification failed");
      const errorData = getApiErrorData(error);
      setErrors({
        form: errorData?.error || "Invalid or expired code. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (mfaState) {
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

            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-50)]">
                <svg className="h-7 w-7 text-[var(--brand-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              {mfaState.challengeName === "MFA_SETUP" ? (
                <>
                  <h1 className="text-2xl font-bold text-[var(--brand-600)] mb-2">Set Up Two-Factor Auth</h1>
                  <p className="text-sm text-gray-500 mb-4">Scan this QR code with your authenticator app, then enter the 6-digit code to confirm.</p>
                  {totpSecret ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="rounded-xl border border-[var(--brand-100)] p-3 bg-white">
                        <QRCodeSVG
                          value={`otpauth://totp/RevClear:${encodeURIComponent(mfaState.email)}?secret=${totpSecret}&issuer=RevClear`}
                          size={160}
                        />
                      </div>
                      <p className="text-xs text-gray-400">Can&apos;t scan? Enter this key manually:</p>
                      <code className="rounded bg-gray-100 px-2 py-1 text-xs font-mono text-gray-700 break-all select-all">{totpSecret}</code>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">Loading QR code…</p>
                  )}
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-[var(--brand-600)] mb-2">Two-Factor Authentication</h1>
                  <p className="text-sm text-gray-500">Enter the 6-digit code from your authenticator app.</p>
                </>
              )}
            </div>

            <form className="space-y-4" onSubmit={handleMfaSubmit} noValidate>
              <AuthSection>
                <AuthField label="Verification Code" required>
                  <AuthInput
                    name="mfaCode"
                    type="text"
                    inputMode="numeric"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    autoComplete="one-time-code"
                    required
                  />
                </AuthField>
              </AuthSection>

              {errors.form && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                  <p className="text-sm text-red-600 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {errors.form}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={isLoading}
                  disabled={isMfaInvalid}
                  className="group w-full rounded-xl hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[var(--brand-500)] disabled:hover:translate-y-0"
                >
                  {mfaState.challengeName === "MFA_SETUP" ? "Verify & Enable 2FA" : "Verify Code"}
                </Button>
                <button
                  type="button"
                  onClick={() => { setMfaState(null); setMfaCode(""); setTotpSecret(null); setErrors({}); }}
                  className="w-full text-center text-sm text-gray-500 hover:text-[var(--brand-600)] transition-colors"
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--brand-50)] via-[#f4fffd] to-[var(--brand-100)] px-4 py-12 font-sans">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2">
              <Link href="/landing" className="cursor-pointer transition-transform hover:scale-105">
                <BrandMark
                  size="md"
                  className="shadow-[0_10px_20px_-12px_rgba(13,148,136,0.45)]"
                />
              </Link>
              <span className="text-2xl font-bold text-[var(--brand-600)]">
                RevClear
              </span>
            </div>
          </div>
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-[var(--brand-600)] mb-2">
              Welcome Back
            </h1>
          </div>

          {confirmedEmail && (
            <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3">
              <p className="text-sm text-green-800">Email confirmed! You can now sign in.</p>
            </div>
          )}

          {sessionExpired && (
            <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
              <p className="text-sm text-amber-800">Your session ended. Please sign in again.</p>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <AuthSection>
              <div className="space-y-4">
                <AuthField label="Email" required>
                  <AuthInput
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    rightElement={
                      <svg
                        className="h-5 w-5 text-[var(--brand-600)]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.75 7.5a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 19.5a7.5 7.5 0 0115 0"
                        />
                      </svg>
                    }
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {errors.email}
                    </p>
                  )}
                </AuthField>

                <AuthField label="Password" required>
                  <AuthInput
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                    autoComplete="current-password"
                    required
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="text-[#9ca3af] hover:text-[#6b7280] transition"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? (
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.036.157-2.036.45-2.975M6.223 6.223A9.955 9.955 0 0112 5c5.523 0 10 4.477 10 10 0 2.07-.623 3.995-1.695 5.596M9.88 9.88a3 3 0 104.243 4.243"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3 3l18 18"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                        )}
                      </button>
                    }
                  />
                  {errors.password && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {errors.password}
                    </p>
                  )}
                  <div className="flex justify-end">
                    <Link
                      href="/forgot-password"
                      className="text-sm font-medium text-[var(--brand-600)] hover:text-[var(--brand-700)]"
                    >
                      Forgot password?
                    </Link>
                  </div>
                </AuthField>
              </div>
            </AuthSection>

            {errors.form && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                <p className="text-sm text-red-600 flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {errors.form}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={isLoading}
                disabled={isFormInvalid}
                className="group w-full rounded-xl hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[var(--brand-500)] disabled:hover:translate-y-0"
              >
                Sign In
              </Button>

              <p className="text-center text-gray-500">
                New here?{" "}
                <Link
                  href="/signup"
                  className="font-semibold text-[var(--brand-600)] hover:text-[var(--brand-700)] transition-colors"
                >
                  Create account
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}
