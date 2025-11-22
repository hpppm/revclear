"use client";

import { useState } from "react";

export default function AddPatientPage() {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [category, setCategory] = useState("mentalHealth");
  const [diagnosis, setDiagnosis] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    alert("Patient added (mock only). Save to DB when backend ready!");
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Add Patient</h1>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl bg-white p-8 max-w-lg shadow border border-slate-200 space-y-6"
      >
        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-1">Full Name</label>
          <input
            type="text"
            className="w-full rounded-lg border px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
          />
        </div>

        {/* Age */}
        <div>
          <label className="block text-sm font-medium mb-1">Age</label>
          <input
            type="number"
            className="w-full rounded-lg border px-3 py-2"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="30"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="mentalHealth">Mental Health</option>
            <option value="speechTherapy">Speech Therapy</option>
            <option value="physicalTherapy">Physical Therapy</option>
          </select>
        </div>

        {/* Diagnosis */}
        <div>
          <label className="block text-sm font-medium mb-1">Diagnosis</label>
          <input
            type="text"
            className="w-full rounded-lg border px-3 py-2"
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="e.g. Anxiety Disorder"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="w-full rounded-lg bg-slate-900 text-white py-2.5 hover:bg-slate-800"
        >
          Save Patient
        </button>
      </form>
    </div>
  );
}
