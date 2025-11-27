"use client";

import { useEffect, useState } from "react";

export type MedicalCode = {
  id: string;
  code: string;
  description: string;
  category: string;
  type: "CPT" | "ICD-10";
  confidence: number;
};

type MedicalCodesViewerProps = {
  codes: MedicalCode[];
  loading?: boolean;
  error?: string | null;
  onGenerate: () => Promise<MedicalCode[]> | MedicalCode[];
  onChange?: (codes: MedicalCode[]) => void;
  title?: string;
  initialFilter?: "all" | "mental" | "physical" | "speech";
  allowedFilters?: Array<"all" | "mental" | "physical" | "speech">;
};

export default function MedicalCodesViewer({
  codes,
  loading,
  error,
  onGenerate,
  onChange,
  title = "Suggested codes",
  initialFilter = "all",
  allowedFilters,
}: MedicalCodesViewerProps) {
  const filterOptions: Array<"all" | "mental" | "physical" | "speech"> =
    allowedFilters && allowedFilters.length > 0
      ? allowedFilters
      : ["mental", "physical", "speech", "all"];

  const [editing, setEditing] = useState<Record<string, string>>({});
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "mental" | "physical" | "speech">(
    (filterOptions.includes(initialFilter as any) ? initialFilter : filterOptions[0]) || "all"
  );

  useEffect(() => {
    const next = filterOptions.includes(initialFilter as any) ? initialFilter : filterOptions[0];
    setFilter((prev) => (filterOptions.includes(prev) ? prev : next));
  }, [initialFilter, filterOptions]);

  const matchesFilter = (category: string) => {
    if (filter === "all") return true;
    const normalized = category.toLowerCase();
    if (filter === "mental") return normalized.includes("mental");
    if (filter === "physical") return normalized.includes("physical");
    if (filter === "speech") return normalized.includes("speech");
    return true;
  };

  const cptCodes = codes.filter((c) => c.type === "CPT" && matchesFilter(c.category));
  const icdCodes = codes.filter((c) => c.type === "ICD-10" && matchesFilter(c.category));

  const handleGenerate = async () => {
    try {
      setLocalError(null);
      setLocalLoading(true);
      const next = await onGenerate();
      onChange?.(next);
    } catch (err: any) {
      setLocalError(err?.message || "Failed to generate codes.");
    } finally {
      setLocalLoading(false);
    }
  };

  const handleRemove = (id: string) => {
    const next = codes.filter((c) => c.id !== id);
    onChange?.(next);
  };

  const handleEdit = (id: string, value: string) => {
    setEditing((prev) => ({ ...prev, [id]: value }));
  };

  const handleSave = (id: string) => {
    const value = editing[id];
    const next = codes.map((c) => (c.id === id ? { ...c, description: value } : c));
    onChange?.(next);
    setEditing((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const renderSection = (label: string, list: MedicalCode[]) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <span className="text-xs text-slate-500">{list.length} codes</span>
      </div>
      {list.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          No {label.toLowerCase()} yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((code) => {
            const isEditing = editing[code.id] !== undefined;
            return (
              <div
                key={code.id}
                className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold text-slate-900">{code.code}</div>
                  <span className="text-sm font-semibold text-slate-700">{code.type}</span>
                </div>
                <div className="text-xs font-semibold text-rose-600 uppercase tracking-wide">
                  {code.category}
                </div>
                {isEditing ? (
                  <textarea
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                    value={editing[code.id]}
                    onChange={(e) => handleEdit(code.id, e.target.value)}
                    rows={3}
                  />
                ) : (
                  <p className="text-base text-slate-800 leading-snug">{code.description}</p>
                )}
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span className="font-medium">Confidence</span>
                  <span className="font-bold text-slate-800">
                    {(code.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  {isEditing ? (
                    <button
                      type="button"
                      onClick={() => handleSave(code.id)}
                      className="inline-flex items-center rounded-full bg-rose-500 px-3 py-1 font-semibold text-white shadow-sm transition hover:bg-rose-600"
                    >
                      Save
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleEdit(code.id, code.description)}
                      className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-800 shadow-sm transition hover:bg-slate-200"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(code.id)}
                    className="inline-flex items-center rounded-full bg-white px-3 py-1 font-semibold text-rose-600 border border-rose-200 shadow-sm transition hover:bg-rose-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-sm text-slate-500">Codes</p>
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-600">CPT and ICD-10 suggestions derived from the SOAP note.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || localLoading}
            className="inline-flex items-center rounded-full bg-rose-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading || localLoading ? "Generating..." : "Generate Codes (CPT/ICD)"}
          </button>
          <span className="text-xs text-slate-500">Stubbed; edit or remove as needed.</span>
        </div>
      </div>

      {filterOptions.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">Filter:</span>
          {filterOptions.map((key) => {
            const active = filter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key as any)}
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold shadow-sm transition ${
                  active
                    ? "bg-rose-500 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {key === "all"
                  ? "All"
                  : key === "mental"
                    ? "Mental"
                    : key === "physical"
                      ? "Physical"
                      : "Speech"}
              </button>
            );
          })}
        </div>
      ) : null}

      {(error || localError) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error || localError}
        </div>
      )}

      {codes.length === 0 && !(loading || localLoading) ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Click "Generate Codes (CPT/ICD)" to see suggestions once SOAP is ready.
        </div>
      ) : (
        <div className="space-y-5">
          {renderSection("CPT codes", cptCodes)}
          {renderSection("ICD-10 codes", icdCodes)}
        </div>
      )}
    </section>
  );
}
