"use client";

import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/app/lib/api/apiClient";
import { Claim } from "@/app/lib/types";
import logger from "@/app/lib/logger";

export default function SubmittedClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.claims.getAll();
        const list = response.data?.data || [];
        setClaims(Array.isArray(list) ? list : []);
      } catch (err) {
        logger.error("Failed to fetch claims", err);
        setError("Failed to load submitted claims. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const submittedClaims = useMemo(
    () =>
      claims.filter(
        (c) =>
          !!c.submission_date ||
          (c.status || "").toLowerCase() === "submitted"
      ),
    [claims]
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Submitted</p>
        <h1 className="text-2xl font-semibold text-slate-900">Submitted claims</h1>
        <p className="text-sm text-slate-600">Track what has already been sent.</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-600">
            Loading submitted claims...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50/80 p-4 text-red-700">
            {error}
          </div>
        ) : submittedClaims.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-600">
            No submitted claims yet.
          </div>
        ) : (
          submittedClaims.map((claim) => (
            <div key={claim.id} className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Claim #{claim.id}</p>
                      <p className="text-xs text-slate-500">Encounter {claim.encounter_id || "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Submitted</p>
                      <p className="text-sm font-semibold text-teal-700">
                        {claim.submission_date ? new Date(claim.submission_date).toLocaleDateString() : "—"}
                      </p>
                    </div>
                  </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
                <span>Total: {claim.total_amount ? `$${claim.total_amount}` : "—"}</span>
                <span>Status: {claim.status || "submitted"}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
