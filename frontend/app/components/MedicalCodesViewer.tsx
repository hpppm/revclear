'use client';

import React, { useState, useEffect } from "react";
import { apiClient } from "@/app/lib/api/apiClient";
import { useAuthorization } from "@/app/context/AuthContext";
import logger from "@/app/lib/logger";
import { MedicalCode } from "@/app/lib/types";
import Button from "./ui/Button";
import Card from "./ui/Card";
import Input from "./ui/Input";
import Badge from "./ui/Badge";

const MAX_PER_TYPE = 3;

type MedicalCodesViewerProps = {
  encounterId?: string | null;
  savedCodes?: MedicalCode[];
  onCodesSelected?: (codes: MedicalCode[]) => void;
};

// Raw shape returned by the codes API before normalization
type RawCode = {
  id?: string;
  code: string;
  description: string;
  category?: string;
  confidence?: number;
  confidence_score?: number;
  is_ai_suggested?: boolean;
  source?: string;
};

export default function MedicalCodesViewer({
  encounterId,
  savedCodes = [],
  onCodesSelected,
}: MedicalCodesViewerProps) {
  const { canUseClinicalAI } = useAuthorization();
  // Normalize a raw confidence value to a 0–100 integer.
  // The value may be a 0.0–1.0 decimal (fresh AI / new DB rows) or a legacy
  // integer percentage stored before the /100 save-fix was applied.
  const toDisplayPct = (v: number) => v > 1 ? Math.round(v) : Math.round(v * 100);

  const ensureType = (codes: RawCode[], type: "ICD-10" | "CPT") =>
    (codes || []).map((c) => ({
      id: c.id || `${type}-${c.code}`,
      type,
      code: c.code,
      description: c.description,
      category: c.category || "Unspecified",
      confidence:
        typeof c.confidence === "number"
          ? toDisplayPct(c.confidence)
          : typeof c.confidence_score === "number"
          ? toDisplayPct(c.confidence_score)
          : undefined,
      source: c.is_ai_suggested ? "AI" : c.source,
    }));

  const normalizedSaved = [
    ...ensureType(savedCodes.filter((c) => c.type === "ICD-10"), "ICD-10"),
    ...ensureType(savedCodes.filter((c) => c.type === "CPT"), "CPT"),
  ];

  // Initialize candidates with saved codes
  const [icdCandidates, setIcdCandidates] = useState<MedicalCode[]>(
    normalizedSaved.filter((c) => c.type === "ICD-10")
  );
  const [cptCandidates, setCptCandidates] = useState<MedicalCode[]>(
    normalizedSaved.filter((c) => c.type === "CPT")
  );

  // Initialize selection with saved codes
  const [selectedCodes, setSelectedCodes] = useState<MedicalCode[]>(normalizedSaved);

  // Sync state with savedCodes prop when it changes
  useEffect(() => {
    if (savedCodes.length > 0) {
      const normalized = [
        ...ensureType(savedCodes.filter((c) => c.type === "ICD-10"), "ICD-10"),
        ...ensureType(savedCodes.filter((c) => c.type === "CPT"), "CPT"),
      ];
      setIcdCandidates(normalized.filter((c) => c.type === "ICD-10"));
      setCptCandidates(normalized.filter((c) => c.type === "CPT"));
      setSelectedCodes(normalized);
      setHasGenerated(true);
    }
  }, [savedCodes]); // eslint-disable-line react-hooks/exhaustive-deps

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"icd" | "cpt">("icd");
  const [searchResults, setSearchResults] = useState<MedicalCode[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(savedCodes.length > 0);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showManualSearch, setShowManualSearch] = useState(false);

  const sortCodes = (codes: MedicalCode[]) =>
    [...codes].sort((a, b) => {
      if (a.type === b.type) return a.code.localeCompare(b.code);
      return a.type.localeCompare(b.type);
    });

  const setSelection = (codes: MedicalCode[]) => {
    const sorted = sortCodes(codes);
    setSelectedCodes(sorted);
    onCodesSelected?.(sorted);
  };

  const generateCodes = async () => {
    if (!encounterId || !canUseClinicalAI) return;

    setLoading(true);
    setGenerateError(null);
    try {
      const response = await apiClient.codes.match(encounterId);
      // Handle both response shapes: { data: { icdMatches, ... } } and { success, data: { icdMatches, ... } }
      const responseData = response.data?.data || response.data;
      const { icdMatches, cptMatches } = responseData || {};

      const newIcd = ensureType(icdMatches ?? [], "ICD-10");
      const newCpt = ensureType(cptMatches ?? [], "CPT");

      setIcdCandidates(newIcd);
      setCptCandidates(newCpt);
      // Default-select all candidates (up to 3 per type)
      setSelection([...newIcd, ...newCpt]);
      setHasGenerated(true);
      // Open manual search only when truly nothing came back
      if (newIcd.length === 0 && newCpt.length === 0) setShowManualSearch(true);
    } catch (err: unknown) {
      logger.error("Code generation failed", err);
      const status =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined;
      const serverMsg =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      // 400 means the SOAP note has no usable content — surface a clear message
      const displayMsg =
        status === 400
          ? "The SOAP note doesn't have enough content to generate codes. Edit the SOAP note and try again."
          : serverMsg || "We couldn't generate codes right now. Please try again in a moment.";
      setGenerateError(displayMsg);
      setHasGenerated(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !canUseClinicalAI) return;

    setSearching(true);
    setSearchError(null);
    try {
      const response = await apiClient.codes.search(searchQuery, searchType);
      const rawResults = response.data.data || [];

      // Inject type based on searchType since mock data doesn't have it
      type CodeResult = Omit<MedicalCode, 'type'> & { type?: string };
      const resultsWithType: MedicalCode[] = rawResults.map((r: CodeResult) => ({
        ...r,
        id: r.id || `${searchType === "icd" ? "ICD-10" : "CPT"}-${r.code}`,
        type: (searchType === "icd" ? "ICD-10" : "CPT") as "ICD-10" | "CPT",
        category: r.category || "Unspecified",
      }));

      setSearchResults(resultsWithType);
    } catch {
      logger.error("Search failed");
      setSearchResults([]);
      setSearchError("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const handleSelectCandidate = (code: MedicalCode) => {
    const isSelected = selectedCodes.some(
      (c) => c.code === code.code && c.type === code.type
    );
    if (isSelected) {
      setSelection(
        selectedCodes.filter((c) => !(c.code === code.code && c.type === code.type))
      );
      return;
    }
    const sameTypeCount = selectedCodes.filter((c) => c.type === code.type).length;
    if (sameTypeCount >= MAX_PER_TYPE) return;
    setSelection([...selectedCodes, code]);
  };

  const handleAddFromSearch = (code: MedicalCode) => {
    if (code.type === "ICD-10") {
      if (!icdCandidates.some((c) => c.code === code.code)) {
        setIcdCandidates([...icdCandidates, code]);
      }
    } else {
      if (!cptCandidates.some((c) => c.code === code.code)) {
        setCptCandidates([...cptCandidates, code]);
      }
    }
    const alreadySelected = selectedCodes.some(
      (c) => c.code === code.code && c.type === code.type
    );
    if (alreadySelected) return;
    const sameTypeCount = selectedCodes.filter((c) => c.type === code.type).length;
    if (sameTypeCount >= MAX_PER_TYPE) return;
    setSelection([...selectedCodes, code]);
  };

  const handleRemoveCode = (code: MedicalCode) => {
    setSelection(selectedCodes.filter((c) => !(c.code === code.code && c.type === code.type)));
  };

  const isHighAccuracy = (code: MedicalCode) =>
    typeof code.confidence === "number" && code.confidence >= 85;

  const icdAtCap = selectedCodes.filter((c) => c.type === "ICD-10").length >= MAX_PER_TYPE;
  const cptAtCap = selectedCodes.filter((c) => c.type === "CPT").length >= MAX_PER_TYPE;

  const CandidateCard = ({ code, isSelected, onSelect, isRecommended, atCap }: {
    code: MedicalCode;
    isSelected: boolean;
    onSelect: () => void;
    isRecommended?: boolean;
    atCap?: boolean;
  }) => {
    const highAccuracy = isHighAccuracy(code);
    const recommendedHighlight = !isSelected && isRecommended;
    const disabled = atCap && !isSelected;

    return (
    <div
      onClick={disabled ? undefined : onSelect}
      className={`rounded-xl border-2 p-4 transition-all flex flex-col gap-3 min-h-[170px] ${
        disabled
          ? "border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed"
          : isSelected
          ? "cursor-pointer border-slate-800 bg-white shadow-lg"
          : recommendedHighlight
            ? "cursor-pointer border-sky-300 bg-white shadow-[0_10px_30px_-15px_rgba(14,165,233,0.45)] hover:border-sky-400 hover:shadow-[0_14px_34px_-15px_rgba(14,165,233,0.6)]"
          : highAccuracy
            ? "cursor-pointer border-emerald-300 bg-white shadow-[0_10px_30px_-15px_rgba(5,150,105,0.55)] hover:border-emerald-400 hover:shadow-[0_14px_34px_-15px_rgba(5,150,105,0.65)]"
            : "cursor-pointer border-slate-200 bg-white hover:border-slate-400 hover:shadow-sm"
        }`}
    >
      {/* Top row: code badge + confidence */}
      <div className="flex items-center justify-between">
        <Badge variant="neutral" size="sm">
          {code.code}
        </Badge>
        <div className="flex items-center gap-2">
          {highAccuracy && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
              High Accuracy
            </span>
          )}
          {typeof code.confidence === 'number' && (
            <span className={`text-xs font-semibold flex-shrink-0 ${highAccuracy ? "text-emerald-700" : "text-slate-500"}`}>
              {Math.round(code.confidence)}%
            </span>
          )}
          {isSelected && (
            <svg className="w-4 h-4 text-slate-800 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </div>

      {/* Description — capped at 3 lines so cards stay uniform height */}
      <p className="text-sm font-medium text-slate-900 leading-snug line-clamp-3">
        {code.description}
      </p>

      {/* Footer: category */}
      <div className="mt-auto pt-2 border-t border-slate-100 space-y-1">
        {isRecommended && (
          <p className="text-[11px] font-semibold text-sky-700">Recommended</p>
        )}
        {code.category && (
          <p className="text-xs text-slate-500 leading-snug">{code.category}</p>
        )}
      </div>
    </div>
  );
  };

  return (
    <Card className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Medical Codes</h3>
        <p className="text-sm text-slate-600">
          Select up to 3 ICD-10 and up to 3 CPT codes.
        </p>
      </div>

      {generateError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start justify-between gap-3"
        >
          <span><strong>Code generation failed.</strong> {generateError}</span>
          <Button size="sm" variant="secondary" onClick={generateCodes} disabled={loading}>
            Retry
          </Button>
        </div>
      )}

      {hasGenerated && !generateError && icdCandidates.length === 0 && cptCandidates.length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 text-amber-600 mb-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" x2="12" y1="8" y2="12" />
              <line x1="12" x2="12.01" y1="16" y2="16" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-amber-900 mb-1">
            No matches found
          </h3>
          <p className="text-sm text-amber-700">
            The AI couldn&apos;t find matching codes for this note. Use the manual search below to add codes.
          </p>
        </div>
      )}

      {(icdCandidates.length > 0 || cptCandidates.length > 0) && (
        <div className="space-y-8">
          {/* ICD-10 Candidates */}
          <div>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
                  ICD-10 Diagnosis Codes
                </h4>
              </div>
              <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full whitespace-nowrap mt-0.5">
                {selectedCodes.filter(c => c.type === "ICD-10").length} / {MAX_PER_TYPE} selected
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {icdCandidates.map((code) => (
                <CandidateCard
                  key={`${code.type}-${code.code}`}
                  code={code}
                  isSelected={selectedCodes.some(c => c.code === code.code && c.type === code.type)}
                  isRecommended={icdCandidates[0]?.code === code.code}
                  atCap={icdAtCap}
                  onSelect={() => handleSelectCandidate(code)}
                />
              ))}
            </div>
          </div>

          {/* CPT Candidates */}
          <div>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
                  CPT Procedure Codes
                </h4>
              </div>
              <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full whitespace-nowrap mt-0.5">
                {selectedCodes.filter(c => c.type === "CPT").length} / {MAX_PER_TYPE} selected
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {cptCandidates.map((code) => (
                <CandidateCard
                  key={`${code.type}-${code.code}`}
                  code={code}
                  isSelected={selectedCodes.some(c => c.code === code.code && c.type === code.type)}
                  isRecommended={cptCandidates[0]?.code === code.code}
                  atCap={cptAtCap}
                  onSelect={() => handleSelectCandidate(code)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Find Codes + Manual Search toggle */}
      <div className="border-t border-slate-200 pt-4">
        <div className="flex items-center justify-between gap-4">
          <Button onClick={generateCodes} loading={loading} disabled={loading}>
            {loading ? "Finding codes..." : "Find Codes"}
          </Button>
          <button
            onClick={() => setShowManualSearch((v) => !v)}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded"
            aria-expanded={showManualSearch}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 transition-transform ${showManualSearch ? "rotate-90" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {showManualSearch ? "Hide manual search" : "Can't find a code? Search manually"}
          </button>
        </div>

        {showManualSearch && (
        <div className="mt-4 space-y-3">
        <div className="flex gap-2">
          <select
            id="code-search-type"
            name="code-search-type"
            value={searchType}
            onChange={(e) => setSearchType(e.target.value as "icd" | "cpt")}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="icd">ICD-10 (Diagnosis)</option>
            <option value="cpt">CPT (Procedure)</option>
          </select>
          <Input
            placeholder="Search for codes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1"
          />
          <Button variant="secondary" size="sm" onClick={handleSearch} loading={searching} disabled={searching}>
            Search
          </Button>
        </div>

        {searchError && (
          <div
            role="alert"
            className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start justify-between gap-3"
          >
            <span><strong>Search failed.</strong> {searchError}</span>
            <Button size="sm" variant="secondary" onClick={handleSearch} disabled={searching}>
              Retry
            </Button>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-slate-500 mb-2">{searchResults.length} results found</p>
            {searchResults.map((code) => {
              const isAdded = selectedCodes.some(c => c.code === code.code && c.type === code.type);
              const atCap = selectedCodes.filter(c => c.type === code.type).length >= MAX_PER_TYPE;
              return (
                <div
                  key={code.id || code.code}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="neutral" size="sm">{code.code}</Badge>
                      <span className="text-sm font-medium text-slate-900">{code.description}</span>
                    </div>
                    {code.category && (
                      <p className="text-xs text-slate-500">{code.category}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={isAdded ? "secondary" : "primary"}
                    onClick={() => !isAdded && !atCap && handleAddFromSearch(code)}
                    disabled={isAdded || atCap}
                    className={isAdded || atCap ? "opacity-50 cursor-not-allowed" : ""}
                  >
                    {isAdded ? "Added" : atCap ? "At limit" : "Add"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
        </div>
        )}
      </div>

      {/* Selected Codes List */}
      {selectedCodes.length > 0 && (
        <div className="border-t border-slate-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-slate-800">Selected Codes</h4>
            <span className="text-xs text-slate-500">{selectedCodes.length} total</span>
          </div>
          <div className="space-y-2">
            {selectedCodes.map((code) => (
              <div
                key={`${code.type}-${code.code}`}
                className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Badge variant="neutral" size="sm" className="flex-shrink-0">{code.code}</Badge>
                  <Badge variant="neutral" size="sm" className="flex-shrink-0 uppercase">
                    {code.type || "Unknown"}
                  </Badge>
                  <span className="text-sm text-slate-800 truncate" title={code.description}>
                    {code.description}
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveCode(code)}
                  className="flex-shrink-0 text-slate-400 hover:text-red-500 transition-colors"
                  title="Remove code"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
