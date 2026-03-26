"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/app/components/ui/BrandMark";
import { apiClient } from "@/app/lib/api/apiClient";
import { ForgotPasswordRequestSchema, ForgotPasswordConfirmSchema } from "@/app/lib/validation/schemas";
import logger from "@/app/lib/logger";
import Button from "@/app/components/ui/Button";

type Step = "REQUEST" | "CONFIRM";

type FieldErrors = {
  email?: string;
  code?: string;
  password?: string;
  form?: string;
};

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("REQUEST");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const isRequestInvalid = useMemo(() => !email.trim(), [email]);
  const isConfirmInvalid = useMemo(
    () => !email.trim() || !code.trim() || !password.trim(),
    [email, code, password]
  );

  async function handleRequestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setMessage("");

    const validation = ForgotPasswordRequestSchema.safeParse({ email });
    if (!validation.success) {
      const fieldErrors: FieldErrors = {};
      validation.error.errors.forEach((err: { path: (string | number)[]; message: string }) => {
        const field = err.path[0] as keyof FieldErrors;
        if (field && !fieldErrors[field]) fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.auth.forgotPassword(email);
      setStep("CONFIRM");
      setMessage("If an account exists, a reset code has been sent to your email.");
    } catch {
      // Even if it fails, we often don't want to reveal it, but here we can show a generic error
      logger.error("Forgot password request failed");
      // For UX, we might still move to the next step or show a message
      // mimicking the backend behavior which returns 200 usually.
      setStep("CONFIRM");
      setMessage("If an account exists, a reset code has been sent to your email.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConfirmSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setMessage("");

    const validation = ForgotPasswordConfirmSchema.safeParse({ email, code, newPassword: password });
    if (!validation.success) {
      const nextErrors: FieldErrors = {};
      validation.error.errors.forEach((err: { path: (string | number)[]; message: string }) => {
        const field = err.path[0] === "newPassword" ? "password" : err.path[0] as keyof FieldErrors;
        if (field && !nextErrors[field]) nextErrors[field] = err.message;
      });
      setErrors(nextErrors);
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.auth.confirmForgotPassword({
        email,
        code,
        newPassword: password,
      });
      setMessage("Password reset successfully. Redirecting to login...");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error: unknown) {
      logger.error("Confirm forgot password failed");
      const apiError = error as { response?: { data?: { error?: string } } };
      const errorMessage =
        apiError.response?.data?.error || "Invalid code or password requirements not met.";
      setErrors({ form: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 font-sans">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/landing" className="inline-flex items-center gap-2 group">
            <BrandMark size="lg" className="transition-transform group-hover:scale-105" />
            <span className="text-3xl font-bold text-gray-900">RevClear</span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-200/50 p-8">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {step === "REQUEST" ? "Reset Password" : "Set New Password"}
            </h1>
            <p className="text-gray-500">
              {step === "REQUEST"
                ? "Enter your email to receive reset instructions"
                : "Enter the code sent to your email and your new password"}
            </p>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-xl text-sm ${message.includes("success") || message.includes("sent") ? "bg-green-50 text-green-700 border border-green-100" : "bg-blue-50 text-blue-700 border border-blue-100"}`}>
               {message}
            </div>
          )}

          {step === "REQUEST" ? (
            <form className="space-y-5" onSubmit={handleRequestSubmit} noValidate>
              {/* Email Field */}
              <div className="space-y-2">
                <label
                  className="block text-sm font-semibold text-gray-700"
                  htmlFor="email"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-gray-300 text-gray-900 rounded-xl px-4 py-3 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={isLoading}
                disabled={isRequestInvalid}
                className="w-full rounded-xl hover:-translate-y-0.5 transition-all duration-200 disabled:hover:translate-y-0"
              >
                Send Reset Code
              </Button>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={handleConfirmSubmit} noValidate>
               {/* Email Field (Read Only or Editable if they messed up) */}
               <div className="space-y-2">
                <label
                  className="block text-sm font-semibold text-gray-700"
                  htmlFor="confirm-email"
                >
                  Email Address
                </label>
                <input
                  id="confirm-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 text-gray-500 rounded-xl px-4 py-3 outline-none"
                />
              </div>

              {/* Code Field */}
              <div className="space-y-2">
                <label
                  className="block text-sm font-semibold text-gray-700"
                  htmlFor="code"
                >
                  Verification Code
                </label>
                <input
                  id="code"
                  name="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-white border border-gray-300 text-gray-900 rounded-xl px-4 py-3 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400"
                  placeholder="123456"
                  autoComplete="one-time-code"
                />
                {errors.code && (
                  <p className="text-sm text-red-500">{errors.code}</p>
                )}
              </div>

              {/* New Password Field */}
              <div className="space-y-2">
                <label
                  className="block text-sm font-semibold text-gray-700"
                  htmlFor="new-password"
                >
                  New Password
                </label>
                <input
                  id="new-password"
                  name="newPassword"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-gray-300 text-gray-900 rounded-xl px-4 py-3 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password}</p>
                )}
              </div>

              {errors.form && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                  <p className="text-sm text-red-600">{errors.form}</p>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={isLoading}
                disabled={isConfirmInvalid}
                className="w-full rounded-xl hover:-translate-y-0.5 transition-all duration-200 disabled:hover:translate-y-0"
              >
                Reset Password
              </Button>
            </form>
          )}

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="font-medium text-gray-500 hover:text-gray-900 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
