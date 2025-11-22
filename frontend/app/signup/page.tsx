"use client";

import { useState, FormEvent } from "react";

export default function SignupPage() {
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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (form.password !== form.confirm) {
      alert("Passwords do not match");
      return;
    }

    alert("Account created (mock)");
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0F6FF] px-4">
      <div className="flex w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden bg-white">

        {/* LEFT BLUE PANEL */}
        <div className="hidden md:flex w-1/2 bg-[#2563EB] items-center justify-center p-10">
          <div className="text-white text-center space-y-4">
            <h2 className="text-3xl font-bold">Welcome to RevClear</h2>
            <p className="text-lg opacity-90">
              Smart AI Tools for SOAP Notes & Billing Automation
            </p>
          </div>
        </div>

        {/* RIGHT FORM */}
        <div className="w-full md:w-1/2 p-8 bg-white">
          <h1 className="text-2xl font-bold text-[#0F172A] mb-6">Create Account</h1>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* NAME */}
            <div>
              <label className="text-sm font-medium text-slate-700">Full Name</label>
              <input
                name="name"
                type="text"
                onChange={handleChange}
                className="w-full border border-slate-300 bg-[#F8FAFC] rounded-lg px-3 py-2 mt-1"
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
                className="w-full border border-slate-300 bg-[#F8FAFC] rounded-lg px-3 py-2 mt-1"
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
                className="w-full border border-slate-300 bg-[#F8FAFC] rounded-lg px-3 py-2 mt-1"
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
                className="w-full border border-slate-300 bg-[#F8FAFC] rounded-lg px-3 py-2 mt-1"
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
                className="w-full border border-slate-300 bg-[#F8FAFC] rounded-lg px-3 py-2 mt-1"
                required
              />
              <p
                className={`text-sm mt-1 ${
                  passwordStrength === "Weak"
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
                <li>• Minimum 8 characters</li>
                <li>• At least one uppercase letter</li>
                <li>• At least one number</li>
                <li>• At least one symbol (!@#$%)</li>
              </ul>
            </div>

            {/* CONFIRM */}
            <div>
              <label className="text-sm font-medium text-slate-700">Confirm Password</label>
              <input
                name="confirm"
                type="password"
                onChange={handleChange}
                className="w-full border border-slate-300 bg-[#F8FAFC] rounded-lg px-3 py-2 mt-1"
                required
              />
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold py-2.5 rounded-lg mt-2 transition"
            >
              Create Account
            </button>

            <p className="text-sm text-center mt-2">
              Already have an account?{" "}
              <a href="/login" className="text-[#2563EB] font-medium underline">
                Sign In
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
