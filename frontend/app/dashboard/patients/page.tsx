"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { mockPatients } from "@/app/lib/mock/mockPatients";
import { Patient } from "@/app/lib/types";

export default function PatientsPage() {
  const [doctorType, setDoctorType] = useState("");
  const [customPatients, setCustomPatients] = useState<Patient[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: "",
    dob: "",
    phone: "",
    insuranceType: "Insurance provider",
    insuranceId: "",
    diagnosisType: "",
  });

  useEffect(() => {
    const p = localStorage.getItem("practitionerType") || "";
    setDoctorType(p);
    const saved = localStorage.getItem("customPatients");
    if (saved) {
      try {
        setCustomPatients(JSON.parse(saved));
      } catch {
        setCustomPatients([]);
      }
    }
  }, []);

  const categoryMap: Record<string, keyof typeof mockPatients> = {
    "Mental Health": "mentalHealth",
    "Speech Therapy": "speechTherapy",
    "Physical Therapy": "physicalTherapy",
  };

  const categoryKey = categoryMap[doctorType];

  const patients = useMemo(() => {
    const base = categoryKey ? mockPatients[categoryKey] : [];
    return [...customPatients, ...base];
  }, [categoryKey, customPatients]);

  const handleSavePatient = () => {
    const name = newPatient.name.trim();
    if (!name) return;

    const created: Patient = {
      id: `local-${Date.now()}`,
      name,
      age: 0,
      diagnosis: newPatient.diagnosisType || "Not provided",
      dob: newPatient.dob,
      phone: newPatient.phone,
      insuranceType: newPatient.insuranceType,
      insuranceId: newPatient.insuranceId,
      diagnosisType: newPatient.diagnosisType,
    };
    const nextList = [created, ...customPatients];
    setCustomPatients(nextList);
    localStorage.setItem("customPatients", JSON.stringify(nextList));
    setNewPatient({
      name: "",
      dob: "",
      phone: "",
      insuranceType: "Insurance provider",
      insuranceId: "",
      diagnosisType: "",
    });
    setShowAdd(false);
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
          href="/dashboard/encounters/create"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Go to encounter flow
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
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm md:col-span-3"
            placeholder="Diagnosis"
            value={newPatient.diagnosisType}
            onChange={(e) =>
              setNewPatient((prev) => ({ ...prev, diagnosisType: e.target.value }))
            }
          />
          <div className="md:col-span-3 flex gap-2">
            <button
              onClick={handleSavePatient}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Save patient
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
                  diagnosisType: "",
                });
              }}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 shadow-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!categoryKey && patients.length === 0 ? (
        <p className="text-slate-600">No practitioner type found.</p>
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
                  <th className="py-2 pr-4">Diagnosis</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p: Patient, idx: number) => {
                  const fallbackDob = p.dob || `198${idx}-0${(idx % 9) + 1}-1${idx % 9}`;
                  const fallbackInsId = p.insuranceId || `INS-${(idx + 1) * 1734}`;
                  const provider = p.insuranceType || "Insurance provider";
                  return (
                    <tr key={p.id} className="border-b last:border-none">
                      <td className="py-3 pr-4">{p.name}</td>
                      <td className="py-3 pr-4">{fallbackDob}</td>
                      <td className="py-3 pr-4">{provider}</td>
                      <td className="py-3 pr-4">{fallbackInsId}</td>
                      <td className="py-3 pr-4">{p.phone || "—"}</td>
                      <td className="py-3 pr-4">{(p as any).diagnosisType || p.diagnosis}</td>
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
