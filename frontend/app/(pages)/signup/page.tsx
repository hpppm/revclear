"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/app/lib/api/api";
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

  const practitionerTypes = [
    "Mental Health",
    "Speech Therapy",
    "Physical Therapy",
  ];

  const fieldClass =
    "w-full border border-slate-300 bg-white text-slate-900 rounded-lg px-3 py-2 mt-1 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500";

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

    if (form.password !== form.confirm) {
      alert("Passwords do not match");
      return;
    }

    // ⭐ Save practitioner type so Dashboard + Patients page can filter
    localStorage.setItem("practitionerType", form.practitioner);

    try {
      const response = await api.post("/api/auth/signup", {
        email: form.email,
        password: form.password,
        attributes: {
          name: form.name,
          // "custom:practitioner_type": form.practitioner,
          // "custom:license_id": form.license,
        },
      });

      if (response.data.AuthenticationResult) {
        // Auto-login - Use IdToken for authentication (not AccessToken)
        const token = response.data.AuthenticationResult.IdToken;
        localStorage.setItem("token", token);

        // Fetch user details with explicit token
        const userResponse = await api.get("/api/me", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const user = userResponse.data;

        login(token, user);
      } else {
        // Redirect to login
        alert("Account created! Please check your email for verification code.");
        router.push("/login");
      }
    } catch (error: any) {
      console.error("Signup failed:", error);
      console.error("Error response:", error.response?.data);

      const errorData = error.response?.data;
      let errorMessage = "Signup failed. Please try again.";

      if (errorData?.code === "USER_ALREADY_EXISTS") {
        errorMessage = errorData.error + " " + errorData.message;
      } else if (errorData?.error) {
        errorMessage = errorData.error;
        if (errorData.policy) {
          errorMessage += "\n\n" + errorData.policy;
        }
      }

      alert(errorMessage);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#E8F1FF] px-4 py-10">
      <div className="flex w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden bg-white">

        {/* LEFT BLUE SIDE */}
        <div className="hidden md:flex w-1/2 bg-blue-600 items-center justify-center p-10">
          <div className="text-white text-center space-y-4">
            <h2 className="text-3xl font-bold">Join RevClear</h2>
            <p className="text-lg opacity-90">
              AI-powered tools for SOAP notes & billing.
            </p>
          </div>
        </div>

        {/* RIGHT SIGNUP FORM */}
        <div className="w-full md:w-1/2 p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-6">Create Account</h1>

          <form className="space-y-5" onSubmit={handleSubmit}>

            {/* FULL NAME */}
            <div>
              <label className="text-sm font-medium text-slate-700">Full Name</label>
              <input
                name="name"
                type="text"
                onChange={handleChange}
                className={fieldClass}
                placeholder="John Carter"
                required
              />
            </div>

            {/* EMAIL */}
            <div>
              <label className="text-sm font-medium text-slate-700">Email</label>
              <input
                name="email"
                type="email"
                onChange={handleChange}
                className={fieldClass}
                placeholder="you@example.com"
                required
              />
            </div>

            {/* PRACTITIONER TYPE */}
            <div>
              <label className="text-sm font-medium text-slate-700">Practitioner Type</label>
              <select
                name="practitioner"
                onChange={handleChange}
                className={fieldClass}
                required
              >
                <option value="">Select one</option>
                {practitionerTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* LICENSE ID */}
            <div>
              <label className="text-sm font-medium text-slate-700">License / Certification ID</label>
              <input
                name="license"
                type="text"
                onChange={handleChange}
                className={fieldClass}
                placeholder="License Number"
                required
              />
            </div>

            {/* PASSWORD */}
            <div>
              <label className="text-sm font-medium text-slate-700">Password</label>
              <input
                name="password"
                type="password"
                onChange={handleChange}
                className={fieldClass}
                required
              />

              {/* Password Strength */}
              <p
                className={`text-sm mt-1 ${passwordStrength === "Weak"
                  ? "text-red-600"
                  : passwordStrength === "Medium"
                    ? "text-yellow-600"
                    : "text-green-600"
                  }`}
              >
                {passwordStrength && `Password strength: ${passwordStrength}`}
              </p>

              {/* Password Rules */}
              <ul className="text-xs text-slate-500 mt-1 space-y-1">
                <li>- Minimum 8 characters</li>
                <li>- One uppercase letter</li>
                <li>- One number</li>
                <li>- One special symbol (!@#$%)</li>
              </ul>
            </div>

            {/* CONFIRM PASSWORD */}
            <div>
              <label className="text-sm font-medium text-slate-700">Confirm Password</label>
              <input
                name="confirm"
                type="password"
                onChange={handleChange}
                className={fieldClass}
                required
              />
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition"
            >
              Create Account
            </button>

            <p className="text-sm text-center mt-3">
              Already have an account?{" "}
              <Link href="/login" className="text-blue-600 font-medium underline">
                Sign In
              </Link>
            </p>

          </form>
        </div>
      </div>
    </div>
  );
}
