"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/app/lib/api/apiClient";
import { Claim } from "@/app/lib/types";
import logger from "@/app/lib/logger";

export default function ClaimsPage() {
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
        setError("Failed to load claims. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const inProgressClaims = useMemo(
    () => claims.filter((c) => (c.status || "").toLowerCase() !== "submitted"),
    [claims]
  );

  const submittedClaims = useMemo(
    () => claims.filter((c) => (c.status || "").toLowerCase() === "submitted"),
    [claims]
  );

  const getClaimLink = (claim: Claim) => {
    if (claim.encounter_id) {
      return `/dashboard/encounters/create?id=${claim.encounter_id}&step=4`;
    }
    return "/dashboard/claims";
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Claims</p>
        <h1 className="text-2xl font-semibold text-slate-900">Claims in progress</h1>
        <p className="text-sm text-slate-600">Review, finalize, and submit claims.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-600">
            Loading claims...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50/80 p-4 text-red-700">
            {error}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">In progress</p>
              {inProgressClaims.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-600">
                  No claims in progress.
                </div>
              ) : (
                inProgressClaims.map((claim) => (
                  <Link key={claim.id} href={getClaimLink(claim)} className="block">
                    <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 transition hover:border-slate-300">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Claim #{claim.id}</p>
                          <p className="text-xs text-slate-500">Encounter {claim.encounter_id || "—"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Status</p>
                          <p className="text-sm font-semibold text-teal-700">{claim.status || "draft"}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
                        <span>Total: {claim.total_amount ? `$${claim.total_amount}` : "—"}</span>
                        <span>Submitted: {claim.submission_date ? new Date(claim.submission_date).toLocaleDateString() : "—"}</span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Submitted</p>
              {submittedClaims.length === 0 ? (
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
                        <p className="text-sm font-semibold text-slate-900">
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
          </>
        )}
      </div>
    </div>
  );
}
