"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/app/lib/api/apiClient";
import { useAuth } from "@/app/context/AuthContext";

export default function SignupPage() {
  const router = useRouter();
  const { login } = useAuth();

  // Clear any existing auth state when visiting signup
  useState(() => {
    if (typeof window !== 'undefined') {
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
    "Mental Health",
    "Speech Therapy",
    "Physical Therapy",
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
        const token = response.data.AuthenticationResult.IdToken;
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
    if (passwordStrength === "Weak") return "text-red-400";
    if (passwordStrength === "Medium") return "text-yellow-400";
    return "text-green-400";
  };

  const getStrengthBarWidth = () => {
    if (passwordStrength === "Weak") return "w-1/3";
    if (passwordStrength === "Medium") return "w-2/3";
    return "w-full";
  };

  const getStrengthBarColor = () => {
    if (passwordStrength === "Weak") return "bg-red-500";
    if (passwordStrength === "Medium") return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 px-4 py-12">
      {/* Animated background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)] animate-pulse" />

      <div className="relative z-10 w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/landing" className="inline-flex items-center gap-2 group">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/50 group-hover:scale-110 transition-transform">
              <span className="text-white font-bold text-2xl">R</span>
            </div>
            <span className="text-3xl font-bold text-white">RevClear</span>
          </Link>
        </div>

        {/* Signup Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-white mb-2">Create Your Account</h1>
            <p className="text-slate-300">
              Join thousands of clinicians automating their workflow
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Two Column Layout for Name and Email */}
            <div className="grid md:grid-cols-2 gap-5">
              {/* Full Name */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white">
                  Full Name
                </label>
                <input
                  name="name"
                  type="text"
                  onChange={handleChange}
                  className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl px-4 py-3 outline-none transition-all focus:bg-white/20 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 placeholder:text-slate-400"
                  placeholder="Dr. John Carter"
                  required
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white">
                  Email Address
                </label>
                <input
                  name="email"
                  type="email"
                  onChange={handleChange}
                  className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl px-4 py-3 outline-none transition-all focus:bg-white/20 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 placeholder:text-slate-400"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            {/* Two Column Layout for Practitioner and License */}
            <div className="grid md:grid-cols-2 gap-5">
              {/* Practitioner Type */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white">
                  Practitioner Type
                </label>
                <select
                  name="practitioner"
                  onChange={handleChange}
                  className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl px-4 py-3 outline-none transition-all focus:bg-white/20 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50"
                  required
                >
                  <option value="" className="bg-slate-900">Select specialty</option>
                  {practitionerTypes.map((t) => (
                    <option key={t} value={t} className="bg-slate-900">{t}</option>
                  ))}
                </select>
              </div>

              {/* License ID */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white">
                  License / Certification ID
                </label>
                <input
                  name="license"
                  type="text"
                  onChange={handleChange}
                  className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl px-4 py-3 outline-none transition-all focus:bg-white/20 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 placeholder:text-slate-400"
                  placeholder="License Number"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-white">
                Password
              </label>
              <input
                name="password"
                type="password"
                onChange={handleChange}
                className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl px-4 py-3 outline-none transition-all focus:bg-white/20 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 placeholder:text-slate-400"
                placeholder="Create a strong password"
                required
              />

              {/* Password Strength Indicator */}
              {passwordStrength && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${getStrengthColor()}`}>
                      Password strength: {passwordStrength}
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getStrengthBarWidth()} ${getStrengthBarColor()} transition-all duration-300`}
                    />
                  </div>
                </div>
              )}

              {/* Password Requirements */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-3 mt-2">
                <p className="text-xs text-slate-300 font-medium mb-2">Password must contain:</p>
                <ul className="text-xs text-slate-400 space-y-1">
                  <li className="flex items-center gap-2">
                    <span className={form.password.length >= 8 ? "text-green-400" : "text-slate-500"}>
                      {form.password.length >= 8 ? "✓" : "○"}
                    </span>
                    At least 8 characters
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={/[A-Z]/.test(form.password) ? "text-green-400" : "text-slate-500"}>
                      {/[A-Z]/.test(form.password) ? "✓" : "○"}
                    </span>
                    One uppercase letter
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={/[0-9]/.test(form.password) ? "text-green-400" : "text-slate-500"}>
                      {/[0-9]/.test(form.password) ? "✓" : "○"}
                    </span>
                    One number
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={/[^A-Za-z0-9]/.test(form.password) ? "text-green-400" : "text-slate-500"}>
                      {/[^A-Za-z0-9]/.test(form.password) ? "✓" : "○"}
                    </span>
                    One special character (!@#$%)
                  </li>
                </ul>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-white">
                Confirm Password
              </label>
              <input
                name="confirm"
                type="password"
                onChange={handleChange}
                className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl px-4 py-3 outline-none transition-all focus:bg-white/20 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 placeholder:text-slate-400"
                placeholder="Re-enter your password"
                required
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-sm text-red-400 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Create Account
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              )}
            </button>

            {/* Sign In Link */}
            <p className="text-center text-slate-300">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                Sign In
              </Link>
            </p>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-400 text-sm mt-8">
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
