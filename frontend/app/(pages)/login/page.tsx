"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/app/lib/api/apiClient";
import { useAuth } from "@/app/context/AuthContext";

type FieldErrors = {
  email?: string;
  password?: string;
  form?: string;
};

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const LOGO_FULL = "/revclear-logo/vector/default.svg";

  const isFormInvalid = useMemo(
    () => !email.trim() || !password.trim(),
    [email, password]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FieldErrors = {};
    if (!email.trim()) nextErrors.email = "Email is required";
    if (!password.trim()) nextErrors.password = "Password is required";

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length === 0) {
      setIsLoading(true);
      try {
        const response = await apiClient.auth.signin({ email, password });
        const { AuthenticationResult } = response.data;
        const token = AuthenticationResult.AccessToken;

        localStorage.setItem("token", token);
        const userResponse = await apiClient.me.getProfile();
        const user = userResponse.data;
        login(token, user);
      } catch (error: any) {
        console.error("Login failed:", error);
        const errorMessage =
          error.response?.data?.error ||
          error.response?.data?.details ||
          "Invalid email or password";
        setErrors({
          form: errorMessage,
        });
        localStorage.removeItem("token");
      } finally {
        setIsLoading(false);
      }
    }
  }

  const inputBase =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-[0_1px_0_rgba(15,23,42,0.03)] transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none placeholder:text-slate-400";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f7f5fb]">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-violet-200/50 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-10 h-80 w-80 rounded-full bg-fuchsia-100/70 blur-[90px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-96 w-[36rem] -translate-x-1/2 rounded-full bg-indigo-100/60 blur-[110px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-12">
        <div className="w-full rounded-3xl border border-slate-200/70 bg-white/90 p-8 shadow-[0_20px_60px_rgba(76,29,149,0.1)] backdrop-blur">
          <div className="flex items-center justify-center">
            {!logoError ? (
              <img
                src={LOGO_FULL}
                alt="RevClear"
                className="h-12 w-auto object-contain"
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className="text-lg font-semibold text-slate-900">RevClear</span>
            )}
          </div>

          <h1 className="mt-6 text-center text-2xl font-semibold text-slate-900">Welcome back</h1>
          <p className="mt-2 text-center text-sm text-slate-500">
            Sign in to continue your billing workflow.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputBase}
                placeholder="you@clinic.com"
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-sm text-rose-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {errors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputBase}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="text-sm text-rose-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {errors.password}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Having trouble?</span>
              <Link
                href="/forgot-password"
                className="font-semibold text-slate-900 hover:text-slate-700"
              >
                Forgot password
              </Link>
            </div>

            {errors.form && (
              <div className="rounded-2xl border border-rose-100 bg-rose-50/80 p-4">
                <p className="text-sm text-rose-600 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
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

            <button
              type="submit"
              disabled={isFormInvalid || isLoading}
              className="group w-full rounded-2xl bg-slate-900 px-4 py-3.5 text-white shadow-lg shadow-slate-900/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-[0.2em]">
                  Sign in
                  <svg
                    className="h-5 w-5 transition-transform group-hover:translate-x-1"
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
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-500">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-semibold text-slate-900 hover:text-slate-700 transition-colors"
              >
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>

      <p className="pb-10 text-center text-xs text-slate-400">
        Protected by enterprise-grade security and HIPAA compliance
      </p>
    </div>
  );
}
