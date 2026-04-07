"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/app/lib/api/apiClient";
import { useAuth } from "@/app/context/AuthContext";
import { SignupFormSchema } from "@/app/lib/validation/schemas";
import logger from "@/app/lib/logger";
import AuthField from "@/app/components/ui/AuthField";
import AuthInput from "@/app/components/ui/AuthInput";
import AuthSection from "@/app/components/ui/AuthSection";
import AuthCheckbox from "@/app/components/ui/AuthCheckbox";
import PasswordStrengthBlock from "@/app/components/ui/PasswordStrengthBlock";
import { BrandMark } from "@/app/components/ui/BrandMark";
import Button from "@/app/components/ui/Button";

interface ApiErrorData {
  error?: string;
  message?: string;
  policy?: string;
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
    policy: typeof data.policy === "string" ? data.policy : undefined,
  };
}

export default function SignupPage() {
  const router = useRouter();
  const { login } = useAuth();

  // Clear any legacy localStorage tokens when visiting signup
  // (authentication now uses httpOnly cookies)
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
    }
  }, []);

  const [form, setForm] = useState({
    name: "",
    email: "",
    agreeTerms: false,
    agreeBaa: false,
    agreeLicense: false,
    password: "",
    confirm: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const validation = SignupFormSchema.safeParse({
      name: form.name,
      email: form.email,
      password: form.password,
    });
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }

    if (!form.agreeTerms || !form.agreeBaa || !form.agreeLicense) {
      setError("Please accept all required agreements");
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.auth.signup({
        email: form.email,
        password: form.password,
        attributes: {
          name: form.name,
        },
      });

      if (response.data.autoLoggedIn) {
        const userResponse = await apiClient.me.getProfile();
        const user = userResponse.data;

        login(user);
      } else {
        setError(
          "Account created! Please check your email for verification code.",
        );
        setTimeout(() => router.push("/login"), 2000);
      }
    } catch (error: unknown) {
      logger.error("Signup failed");
      const errorData = getApiErrorData(error);
      let errorMessage = "Signup failed. Please try again.";

      if (errorData?.error) {
        errorMessage = errorData.error;
        if (errorData.message) {
          errorMessage += " " + errorData.message;
        }
        if (errorData.policy) {
          errorMessage += " " + errorData.policy;
        }
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--brand-50)] via-[#f4fffd] to-[var(--brand-100)] px-4 py-12 font-sans">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2">
            <Link href="/landing" className="cursor-pointer transition-transform hover:scale-105">
              <BrandMark
                size="lg"
                className="shadow-[0_10px_20px_-10px_rgba(13,148,136,0.45)]"
              />
            </Link>
            <span className="text-3xl font-bold text-[var(--brand-600)]">RevClear</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[var(--brand-100)] p-6 max-w-xl shadow-[0_30px_60px_-25px_rgba(15,23,42,0.55),0_18px_36px_-24px_rgba(15,23,42,0.4)]">
          <div className="h-1.5 w-full rounded-full bg-linear-r from-[var(--brand-500)] to-[var(--brand-700)] mb-6" />
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-[var(--brand-600)] mb-2">
              Create Your Account
            </h1>
            <p >
              Join thousands of clinicians automating their workflow
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <AuthSection>
              <AuthField label="Full Name" required>
                <AuthInput
                  name="name"
                  type="text"
                  onChange={handleChange}
                  placeholder="Dr. John Carter"
                  required
                />
              </AuthField>
              <AuthField label="Email" required>
                <AuthInput
                  name="email"
                  type="email"
                  onChange={handleChange}
                  placeholder="you@clinic.com"
                  required
                />
              </AuthField>
            </AuthSection>

            <AuthSection>
              <AuthField label="Password" required>
                <AuthInput
                  name="password"
                  type={showPassword ? "text" : "password"}
                  onChange={handleChange}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  placeholder="Create a strong password"
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

                <PasswordStrengthBlock
                  password={form.password}
                  isVisible={passwordFocused || form.password.length > 0}
                />
              </AuthField>

              <AuthField label="Confirm Password" required>
                <AuthInput
                  name="confirm"
                  type={showConfirm ? "text" : "password"}
                  onChange={handleChange}
                  placeholder="Re-enter your password"
                  required
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowConfirm((prev) => !prev)}
                      className="text-[#9ca3af] hover:text-[#6b7280] transition"
                      aria-label={
                        showConfirm ? "Hide password" : "Show password"
                      }
                    >
                      {showConfirm ? (
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
              </AuthField>
            </AuthSection>

            <div className="space-y-3 rounded-xl border border-[#e5e7eb] bg-white px-4 py-3">
              <AuthCheckbox
                name="agreeTerms"
                label="I agree to the Terms of Service and Privacy Policy"
                checked={form.agreeTerms}
                required
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    agreeTerms: e.target.checked,
                  }))
                }
              />
              <AuthCheckbox
                name="agreeBaa"
                label="I agree to the HIPAA Business Associate Program (BAA)"
                checked={form.agreeBaa}
                required
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    agreeBaa: e.target.checked,
                  }))
                }
              />
              <AuthCheckbox
                name="agreeLicense"
                label="My license is currently active and in good standing in my state of practice"
                checked={form.agreeLicense}
                required
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    agreeLicense: e.target.checked,
                  }))
                }
              />
            </div>

            {error && (
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
                  {error}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={isLoading}
                className="group w-full rounded-xl shadow-[0_12px_20px_-12px_rgba(13,148,136,0.25)] hover:shadow-[0_14px_24px_-12px_rgba(13,148,136,0.35)] hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[var(--brand-500)] disabled:hover:translate-y-0"
              >
                <span className="flex items-center justify-center gap-2">
                  Create Account
                 
                </span>
              </Button>

              <p className="text-center text-gray-500">
                Already have an account?{" "}
                <Link
                  href="/login"
                className="font-semibold text-[var(--brand-600)] hover:text-[var(--brand-700)] transition-colors"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
