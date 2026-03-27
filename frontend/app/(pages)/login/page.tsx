"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/app/lib/api/apiClient";
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

type FieldErrors = {
  email?: string;
  password?: string;
  form?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isFormInvalid = !email.trim() || !password.trim();

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
        await apiClient.auth.signin({ email, password });

        const userResponse = await apiClient.me.getProfile();
        const user = userResponse.data;

        login(user);
        router.push("/dashboard");
      } catch (error: unknown) {
        logger.error("Login failed");
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
                    placeholder="••••••••"
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
                <span className="flex items-center justify-center gap-2">
                  Sign In
                  <svg
                    className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </span>
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
