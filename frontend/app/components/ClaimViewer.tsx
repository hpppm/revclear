'use client';

import React, { useMemo } from "react";
import { Claim } from "@/app/lib/types";

type ClaimViewerProps = {
  claim: Claim | null;
  onGenerate: () => void;
  onExport: () => void;
  generating?: boolean;
};

const statusColors: Record<Claim["status"], string> = {
  draft: "bg-amber-100 text-amber-700",
  submitted: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  denied: "bg-rose-100 text-rose-700",
};

const ClaimViewer = ({ claim, onGenerate, onExport, generating }: ClaimViewerProps) => {
  const totals = useMemo(() => {
    if (!claim?.codes?.length) return { total: 0 };
    const total = claim.codes.reduce((sum, c) => sum + (c.amount || 0), 0);
    return { total };
  }, [claim]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-slate-500">Claims & billing</p>
          <h2 className="text-2xl font-bold text-slate-900">Claim summary</h2>
          <p className="text-sm text-slate-600">
            Review patient, provider, codes, and totals before exporting.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {generating ? "Generating..." : "Generate Claim"}
          </button>
          <button
            type="button"
            onClick={onExport}
            disabled={!claim}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-800 border border-slate-200 shadow-sm transition hover:border-blue-500 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            Export as PDF
          </button>
          {claim ? (
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusColors[claim.status]}`}
            >
              {claim.status}
            </span>
          ) : null}
        </div>
      </div>

      {!claim ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          No claim generated yet. Click "Generate Claim" to build a draft from the current encounter.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-1 text-sm text-slate-800">
              <p className="text-xs font-semibold text-slate-500">Patient</p>
              <p className="text-base font-semibold text-slate-900">{claim.patient.name}</p>
              <p>ID: {claim.patient.id}</p>
              {claim.patient.insurance && <p>Insurance: {claim.patient.insurance}</p>}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-1 text-sm text-slate-800">
              <p className="text-xs font-semibold text-slate-500">Provider</p>
              <p className="text-base font-semibold text-slate-900">{claim.provider.name}</p>
              <p>NPI: {claim.provider.npi}</p>
              <p>Date of Service: {claim.dateOfService}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-1 text-sm text-slate-800">
              <p className="text-xs font-semibold text-slate-500">Billing</p>
              <p>Claim #: {claim.claimNumber}</p>
              <p>Facility: {claim.facility}</p>
              <p className="font-semibold">Total: ${totals.total.toFixed(2)}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
              Codes & charges
            </div>
            <div className="divide-y divide-slate-100">
              <div className="grid grid-cols-[120px_1fr_120px_100px] gap-3 px-4 py-3 text-xs font-semibold text-slate-600">
                <span>Code</span>
                <span>Description</span>
                <span>Type</span>
                <span className="text-right">Amount</span>
              </div>
              {claim.codes.map((code) => (
                <div
                  key={`${code.type}-${code.code}-${code.description}`}
                  className="grid grid-cols-[120px_1fr_120px_100px] gap-3 px-4 py-3 text-sm text-slate-800"
                >
                  <span className="font-semibold text-slate-900">{code.code}</span>
                  <span>{code.description}</span>
                  <span className="text-slate-600">{code.type}</span>
                  <span className="text-right">${(code.amount || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800 space-y-1">
            <p className="text-xs font-semibold text-slate-500">Notes</p>
            <p>{claim.notes || "No additional notes."}</p>
          </div>
        </div>
      )}
    </section>
  );
};

export default ClaimViewer;
