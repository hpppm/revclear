"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/app/lib/api/apiClient";
import { useAuth } from "@/app/context/AuthContext";

export default function SignupPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [logoError, setLogoError] = useState(false);
  const LOGO_FULL = "/revclear-logo/vector/default.svg";
  const LOGO_MARK = "/revclear-logo/vector/isolated-layout.svg";

  // Clear any existing auth state when visiting signup
  useState(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
    }
  });

  const [form, setForm] = useState({
    name: "",
    email: "",
    license: "",
    practitioner: "",
    password: "",
    confirm: "",
  });

  const [passwordStrength, setPasswordStrength] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const practitionerTypes = [
    "Speech Therapy",
    "Mental Health",
    "Physiotherapy",
  ];

  // Password Strength Logic
  function checkStrength(pw: string) {
    let strength = 0;
    if (pw.length >= 8) strength++;
    if (/[A-Z]/.test(pw)) strength++;
    if (/[0-9]/.test(pw)) strength++;
    if (/[^A-Za-z0-9]/.test(pw)) strength++;

    if (strength <= 1) return "Weak";
    if (strength === 2) return "Medium";
    return "Strong";
  }

  function handleChange(e: any) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });

    if (name === "password") {
      setPasswordStrength(checkStrength(value));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }

    if (!form.practitioner) {
      setError("Please select a practitioner type");
      return;
    }

    localStorage.setItem("practitionerType", form.practitioner);

    setIsLoading(true);
    try {
      const response = await apiClient.auth.signup({
        email: form.email,
        password: form.password,
        attributes: {
          name: form.name,
        },
        practitionerType: form.practitioner,
        licenseId: form.license,
      });

      if (response.data.AuthenticationResult) {
        // Auto-login - Use AccessToken for API authentication
        const token = response.data.AuthenticationResult.AccessToken; // ✅ FIXED
        localStorage.setItem("token", token);

        const userResponse = await apiClient.me.getProfile();
        const user = userResponse.data;

        login(token, user);
      } else {
        setError("Account created! Please check your email for verification code.");
        setTimeout(() => router.push("/login"), 2000);
      }
    } catch (error: any) {
      console.error("Signup failed:", error);
      const errorData = error.response?.data;
      let errorMessage = "Signup failed. Please try again.";

      if (errorData?.code === "USER_ALREADY_EXISTS") {
        errorMessage = errorData.error + " " + errorData.message;
      } else if (errorData?.error) {
        errorMessage = errorData.error;
        if (errorData.policy) {
          errorMessage += " " + errorData.policy;
        }
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  const getStrengthColor = () => {
    if (passwordStrength === "Weak") return "text-rose-500";
    if (passwordStrength === "Medium") return "text-amber-500";
    return "text-emerald-600";
  };

  const getStrengthBarWidth = () => {
    if (passwordStrength === "Weak") return "w-1/3";
    if (passwordStrength === "Medium") return "w-2/3";
    return "w-full";
  };

  const getStrengthBarColor = () => {
    if (passwordStrength === "Weak") return "bg-rose-500";
    if (passwordStrength === "Medium") return "bg-amber-500";
    return "bg-emerald-500";
  };

  const inputBase =
    "w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-slate-900 shadow-[0_1px_0_rgba(15,23,42,0.03)] transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none placeholder:text-slate-400";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f7f5fb]">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-violet-200/50 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-10 h-80 w-80 rounded-full bg-fuchsia-100/70 blur-[90px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-96 w-[36rem] -translate-x-1/2 rounded-full bg-indigo-100/60 blur-[110px]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.06]">
        <div className="absolute left-16 top-32 h-24 w-24 rounded-3xl border border-slate-400/40" />
        <div className="absolute bottom-24 left-10 h-32 w-32 rounded-[2.5rem] border border-slate-400/40" />
        <div className="absolute right-24 top-24 h-20 w-20 rounded-2xl border border-slate-400/40" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-12">
        <div className="grid w-full gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col justify-center gap-10">
            <div className="relative flex items-center justify-center">
              <div className="absolute h-[380px] w-[380px] rounded-full border border-dashed border-violet-300/70" />
              <div className="absolute h-[320px] w-[320px] rounded-full border border-dashed border-fuchsia-300/70" />
              <div className="relative h-[470px] w-[245px] rounded-[3rem] border border-indigo-300/70 bg-gradient-to-b from-white via-violet-50/80 to-indigo-50/70 shadow-[0_30px_80px_rgba(76,29,149,0.15)]">
                <div className="absolute left-1/2 top-3 h-1.5 w-16 -translate-x-1/2 rounded-full bg-slate-200" />
                <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
                  {!logoError ? (
                    <img
                      src={LOGO_FULL}
                      alt="RevClear"
                      className="h-[72px] w-auto -mt-4 object-contain"
                      onError={() => setLogoError(true)}
                    />
                  ) : (
                    <span className="text-xl font-semibold text-slate-900">RevClear</span>
                  )}
                  <div className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-xs text-slate-400">
                    Email
                  </div>
                  <div className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-xs text-slate-400">
                    Password
                  </div>
                  <Link
                    href="/login"
                    className="w-full rounded-2xl bg-violet-600 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            </div>

            <div className="max-w-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-violet-600/80">
                Medical billing software
              </p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
                Speech Therapy • Mental Health • Physiotherapy
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-8 shadow-[0_20px_60px_rgba(76,29,149,0.1)] backdrop-blur">
            <div className="flex items-start justify-between gap-4" />

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Full Name</label>
                <input
                  name="name"
                  type="text"
                  onChange={handleChange}
                  className={inputBase}
                  placeholder="Dr. John Carter"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Email Address</label>
                <input
                  name="email"
                  type="email"
                  onChange={handleChange}
                  className={inputBase}
                  placeholder="you@clinic.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Practitioner Type</label>
                <select
                  name="practitioner"
                  onChange={handleChange}
                  className={`${inputBase} appearance-none bg-[linear-gradient(45deg,transparent_50%,#7c3aed_50%),linear-gradient(135deg,#7c3aed_50%,transparent_50%),linear-gradient(to_right,#ffffff,#ffffff)] bg-[length:10px_10px,10px_10px,100%_100%] bg-[position:calc(100%-22px)_20px,calc(100%-16px)_20px,0_0] bg-no-repeat pr-12`}
                  required
                >
                  <option value="" className="text-slate-400">
                    Select specialty
                  </option>
                  {practitionerTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  License / Certification ID
                </label>
                <input
                  name="license"
                  type="text"
                  onChange={handleChange}
                  className={inputBase}
                  placeholder="License Number"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Password</label>
                <input
                  name="password"
                  type="password"
                  onChange={handleChange}
                  className={inputBase}
                  placeholder="Create a strong password"
                  required
                />

                {passwordStrength && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold ${getStrengthColor()}`}>
                        Password strength: {passwordStrength}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${getStrengthBarWidth()} ${getStrengthBarColor()} transition-all duration-300`}
                      />
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                  <p className="text-xs font-semibold text-slate-500">Password must contain:</p>
                  <div className="mt-2 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                    <span className="flex items-center gap-2">
                      <span className={form.password.length >= 8 ? "text-emerald-500" : "text-slate-300"}>
                        {form.password.length >= 8 ? "✓" : "○"}
                      </span>
                      At least 8 characters
                    </span>
                    <span className="flex items-center gap-2">
                      <span className={/[A-Z]/.test(form.password) ? "text-emerald-500" : "text-slate-300"}>
                        {/[A-Z]/.test(form.password) ? "✓" : "○"}
                      </span>
                      One uppercase letter
                    </span>
                    <span className="flex items-center gap-2">
                      <span className={/[0-9]/.test(form.password) ? "text-emerald-500" : "text-slate-300"}>
                        {/[0-9]/.test(form.password) ? "✓" : "○"}
                      </span>
                      One number
                    </span>
                    <span className="flex items-center gap-2">
                      <span className={/[^A-Za-z0-9]/.test(form.password) ? "text-emerald-500" : "text-slate-300"}>
                        {/[^A-Za-z0-9]/.test(form.password) ? "✓" : "○"}
                      </span>
                      One special character
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Confirm Password</label>
                <input
                  name="confirm"
                  type="password"
                  onChange={handleChange}
                  className={inputBase}
                  placeholder="Re-enter your password"
                  required
                />
              </div>

              {error && (
                <div className="rounded-2xl border border-rose-100 bg-rose-50/80 p-4">
                  <p className="text-sm text-rose-600 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
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

              <button
                type="submit"
                disabled={isLoading}
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
                    Creating account...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-[0.2em]">
                    Register
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

              <p className="text-center text-sm text-slate-500">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-slate-900 hover:text-slate-700">
                  Sign In
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>

      <p className="pb-10 text-center text-xs text-slate-400">
        By creating an account, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}
