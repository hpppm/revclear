"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/app/lib/api/apiClient";
import { Encounter, Patient } from "@/app/lib/types";
import logger from "@/app/lib/logger";

export default function EncountersPage() {
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [encountersRes, patientsRes] = await Promise.allSettled([
          apiClient.encounters.getAll(),
          apiClient.patients.getAll(),
        ]);

        if (encountersRes.status === "fulfilled") {
          const list = encountersRes.value.data?.data || [];
          setEncounters(Array.isArray(list) ? list : []);
        } else {
          setEncounters([]);
        }

        if (patientsRes.status === "fulfilled") {
          type RawPatient = {
            id: string;
            full_name?: string;
            name?: string;
            age?: number;
            dob?: string;
            phone?: string;
          };
          const rawPatients = patientsRes.value.data?.data || [];
          const mapped = Array.isArray(rawPatients)
            ? (rawPatients as RawPatient[]).map((p) => ({
                id: p.id,
                name: p.full_name || p.name,
                age: p.age || 0,
                dob: p.dob,
                phone: p.phone,
              }))
            : [];
          setPatients(mapped);
        } else {
          setPatients([]);
        }
      } catch (err) {
        logger.error("Failed to fetch encounters", err);
        setError("Failed to load encounters. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const allEncounters = useMemo(() => encounters, [encounters]);

  const patientNameById = useMemo(() => {
    const map = new Map<string, string>();
    patients.forEach((p) => {
      if (p.id && p.name) {
        map.set(p.id, p.name);
      }
    });
    return map;
  }, [patients]);

  const getEncounterLink = (encounter: Encounter) => {
    if (encounter.status === "completed" || encounter.status === "archived") {
      return `/dashboard/encounters/${encounter.id}`;
    }
    let step = 0;
    switch (encounter.status) {
      case "draft":
      case "scheduled":
        step = 0;
        break;
      case "in_progress":
        step = 1;
        break;
      case "ready_for_review":
        step = 2;
        break;
      case "ready":
        step = 4;
        break;
      default:
        step = 0;
    }
    return `/dashboard/encounters/create?id=${encounter.id}&step=${step}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Encounters</p>
          <h1 className="text-2xl font-semibold text-slate-900">Active encounter queue</h1>
          <p className="text-sm text-slate-600">Resume drafts and move encounters to review.</p>
        </div>
        <Link
          href="/dashboard/encounters/create"
          className="rounded-2xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600"
        >
          New encounter
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-600">
            Loading encounters...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50/80 p-4 text-red-700">
            {error}
          </div>
        ) : allEncounters.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-600">
            No encounters yet.
          </div>
        ) : (
          allEncounters.map((encounter) => (
            <Link key={encounter.id} href={getEncounterLink(encounter)} className="block">
              <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 transition hover:border-slate-300">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">
                      {encounter.patient_name || patientNameById.get(encounter.patient_id) || "Unnamed patient"}
                    </p>
                    <p className="text-sm text-slate-500">
                      {encounter.date_of_service
                        ? new Date(encounter.date_of_service).toLocaleDateString()
                        : "Date pending"}
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                    {encounter.status.replace("_", " ")}
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
