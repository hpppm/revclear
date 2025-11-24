"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiClient } from "@/app/lib/api/apiClient";
import { Patient } from "@/app/lib/types";

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: "",
    dob: "",
    phone: "",
    insuranceType: "Insurance provider",
    insuranceId: "",
  });

  const fetchPatients = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.patients.getAll();
      // Backend returns { success: true, data: [...] }
      const rawPatients = response.data?.data || [];

      const mappedPatients: Patient[] = Array.isArray(rawPatients)
        ? rawPatients.map((p: any) => ({
          id: p.id,
          name: p.full_name,
          age: p.age || 0, // Backend might not return age, calculate or default
          dob: p.dob,
          phone: p.phone,
          insuranceType: p.insurance_provider,
          insuranceId: p.insurance_policy_number,
          diagnosis: p.diagnosis, // If backend adds it back
        }))
        : [];

      setPatients(mappedPatients);
    } catch (err) {
      console.error("Failed to fetch patients", err);
      setError("Failed to load patients. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleSavePatient = async () => {
    const name = newPatient.name.trim();
    if (!name) return;

    setCreating(true);
    try {
      await apiClient.patients.create({
        full_name: name,
        dob: newPatient.dob || undefined,
        phone: newPatient.phone || undefined,
        insurance_provider: newPatient.insuranceType || undefined,
        insurance_policy_number: newPatient.insuranceId || undefined,
      });

      // Reset form
      setNewPatient({
        name: "",
        dob: "",
        phone: "",
        insuranceType: "Insurance provider",
        insuranceId: "",
      });
      setShowAdd(false);

      // Refresh list
      await fetchPatients();
    } catch (err) {
      console.error("Failed to create patient", err);
      const msg = (err as any).response?.data?.errors?.[0]?.message || (err as any).response?.data?.message || "Failed to create patient. Please check your input.";
      alert(msg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Patients workspace</p>
          <h1 className="text-3xl font-bold text-slate-900">Patient details</h1>
          <p className="text-slate-600">
            Review registered patients or add new, then start an encounter.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          ← Back to Dashboard
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={() => setShowAdd((p) => !p)}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 bg-white hover:border-blue-500"
        >
          {showAdd ? "Close add patient" : "Add new patient"}
        </button>
        <Link
          href="/dashboard/encounters/create"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
        >
          Start encounter
        </Link>
      </div>

      {showAdd && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm"
            placeholder="Full name"
            value={newPatient.name}
            onChange={(e) => setNewPatient((prev) => ({ ...prev, name: e.target.value }))}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm"
            type="date"
            placeholder="Date of birth"
            value={newPatient.dob}
            onChange={(e) => setNewPatient((prev) => ({ ...prev, dob: e.target.value }))}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm"
            placeholder="Insurance provider"
            value={newPatient.insuranceType}
            onChange={(e) =>
              setNewPatient((prev) => ({ ...prev, insuranceType: e.target.value }))
            }
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm"
            placeholder="Insurance ID"
            value={newPatient.insuranceId}
            onChange={(e) =>
              setNewPatient((prev) => ({ ...prev, insuranceId: e.target.value }))
            }
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm"
            placeholder="Phone number"
            value={newPatient.phone}
            onChange={(e) =>
              setNewPatient((prev) => ({ ...prev, phone: e.target.value }))
            }
          />

          <div className="md:col-span-3 flex gap-2">
            <button
              onClick={handleSavePatient}
              disabled={creating || !newPatient.name}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {creating ? "Saving..." : "Save patient"}
            </button>
            <button
              onClick={() => {
                setShowAdd(false);
                setNewPatient({
                  name: "",
                  dob: "",
                  phone: "",
                  insuranceType: "Insurance provider",
                  insuranceId: "",
                });
              }}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 shadow-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-slate-600">Loading patients...</p>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      ) : patients.length === 0 ? (
        <p className="text-slate-600">No patients found. Add one to get started.</p>
      ) : (
        <div className="rounded-xl bg-white p-6 shadow border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-800">
              Registered patients
            </h2>
            <p className="text-sm text-slate-500">
              Click a patient to jump to the encounter flow.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b text-slate-700">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">DOB</th>
                  <th className="py-2 pr-4">Insurance Provider</th>
                  <th className="py-2 pr-4">Insurance ID</th>
                  <th className="py-2 pr-4">Phone</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p: Patient, idx: number) => {
                  const fallbackDob = p.dob ? new Date(p.dob).toLocaleDateString() : "—";
                  const fallbackInsId = p.insuranceId || "—";
                  const provider = p.insuranceType || "—";
                  return (
                    <tr key={p.id} className="border-b last:border-none">
                      <td className="py-3 pr-4">{p.name}</td>
                      <td className="py-3 pr-4">{fallbackDob}</td>
                      <td className="py-3 pr-4">{provider}</td>
                      <td className="py-3 pr-4">{fallbackInsId}</td>
                      <td className="py-3 pr-4">{p.phone || "—"}</td>
                      <td className="py-3 text-right">
                        <Link
                          href={`/dashboard/encounters/create?patientId=${encodeURIComponent(p.id)}`}
                          className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                        >
                          Start encounter
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
