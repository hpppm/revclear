"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/app/lib/api/api";
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
      try {
        const response = await api.post("/api/auth/signin", { email, password });
        const { AuthenticationResult } = response.data;
        const token = AuthenticationResult.IdToken; // Use IdToken for authentication

        // Temporarily set token to fetch user
        localStorage.setItem("token", token);

        // Fetch user details
        const userResponse = await api.get("/api/me");
        const user = userResponse.data;

        login(token, user);
      } catch (error: any) {
        console.error("Login failed:", error);
        console.error("Error response:", error.response?.data);
        const errorMessage = error.response?.data?.error || error.response?.data?.details || "Invalid email or password";
        setErrors({
          form: errorMessage,
        });
        localStorage.removeItem("token"); // Cleanup if failed
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-lg shadow-slate-200">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold text-slate-900">Log in</h1>
            <p className="mt-2 text-sm text-slate-500">
              Enter your credentials to continue.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="space-y-1.5">
              <label
                className="block text-sm font-medium text-slate-700"
                htmlFor="email"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none ring-2 ring-transparent transition focus:border-slate-300 focus:ring-blue-100"
                placeholder="you@example.com"
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                className="block text-sm font-medium text-slate-700"
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
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none ring-2 ring-transparent transition focus:border-slate-300 focus:ring-blue-100"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {errors.form && (
              <p className="text-sm text-red-600">{errors.form}</p>
            )}

            <button
              type="submit"
              className="flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isFormInvalid}
            >
              Continue
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-600">
            Don't have an account?{" "}
            <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-500 hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
