"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/app/lib/api/apiClient";
import { useAuth } from "@/app/context/AuthContext";

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
        const token = AuthenticationResult.AccessToken; // ✅ FIXED: Use AccessToken for API authentication

        // Temporarily set token to fetch user
        localStorage.setItem("token", token);

        // Fetch user details
        const userResponse = await apiClient.me.getProfile();
        const user = userResponse.data;

        login(token, user);
      } catch (error: any) {
        console.error("Login failed:", error);
        const errorMessage = error.response?.data?.error || error.response?.data?.details || "Invalid email or password";
        setErrors({
          form: errorMessage,
        });
        localStorage.removeItem("token");
      } finally {
        setIsLoading(false);
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 px-4 py-12">
      {/* Animated background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)] animate-pulse" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/landing" className="inline-flex items-center gap-2 group">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/50 group-hover:scale-110 transition-transform">
              <span className="text-white font-bold text-2xl">R</span>
            </div>
            <span className="text-3xl font-bold text-white">RevClear</span>
          </Link>
        </div>

        {/* Login Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-slate-300">
              Sign in to continue to your dashboard
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            {/* Email Field */}
            <div className="space-y-2">
              <label
                className="block text-sm font-semibold text-white"
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
                className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl px-4 py-3 outline-none transition-all focus:bg-white/20 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 placeholder:text-slate-400"
                placeholder="you@example.com"
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-sm text-red-400 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label
                className="block text-sm font-semibold text-white"
                htmlFor="password"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl px-4 py-3 outline-none transition-all focus:bg-white/20 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 placeholder:text-slate-400"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="text-sm text-red-400 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.password}
                </p>
              )}
            </div>

            {/* Form Error */}
            {errors.form && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-sm text-red-400 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {errors.form}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isFormInvalid || isLoading}
              className="group relative w-full bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 overflow-hidden"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Sign In
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-slate-300">
              Don't have an account?{" "}
              <Link
                href="/signup"
                className="font-semibold text-blue-400 hover:text-blue-300 transition-colors"
              >
                Create Account
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-400 text-sm mt-8">
          Protected by enterprise-grade security and HIPAA compliance
        </p>
      </div>
    </div>
  );
}