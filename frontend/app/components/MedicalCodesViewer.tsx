'use client';

import React, { useState, useEffect } from "react";
import { apiClient } from "@/app/lib/api/apiClient";
import logger from "@/app/lib/logger";
import { MedicalCode, SoapNote } from "@/app/lib/types";
import Button from "./ui/Button";
import Card from "./ui/Card";
import Input from "./ui/Input";
import Badge from "./ui/Badge";

type MedicalCodesViewerProps = {
  soap?: SoapNote | null;
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
  soap: _,
  encounterId,
  savedCodes = [],
  onCodesSelected,
}: MedicalCodesViewerProps) {
  const ensureType = (codes: RawCode[], type: "ICD-10" | "CPT") =>
    (codes || []).map((c) => ({
      id: c.id || `${type}-${c.code}`,
      type,
      code: c.code,
      description: c.description,
      category: c.category || "Unspecified",
      confidence:
        typeof c.confidence === "number"
          ? Math.round(c.confidence * 100)
          : typeof c.confidence_score === "number"
          ? Math.round(c.confidence_score * 100)
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
      onCodesSelected?.(normalized);
      setHasGenerated(true);
    }
  }, [savedCodes]);

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"icd" | "cpt">("icd");
  const [searchResults, setSearchResults] = useState<MedicalCode[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(savedCodes.length > 0);

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
    if (!encounterId) return;

    setLoading(true);
    try {
      const response = await apiClient.codes.match(encounterId);
      const { icdMatches, cptMatches } = response.data.data;

      setIcdCandidates(ensureType(icdMatches, "ICD-10"));
      setCptCandidates(ensureType(cptMatches, "CPT"));
      setHasGenerated(true);
    } catch {
      logger.error("Code generation failed");
      setHasGenerated(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
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
    } finally {
      setSearching(false);
    }
  };

  const handleSelectCandidate = (code: MedicalCode) => {
    const isSelected = selectedCodes.some((c) => c.code === code.code && c.type === code.type);
    if (isSelected) {
      setSelection(selectedCodes.filter((c) => !(c.code === code.code && c.type === code.type)));
    } else {
      setSelection([...selectedCodes, code]);
    }
  };

  const handleAddFromSearch = (code: MedicalCode) => {
    // Add to candidates if not already there
    if (code.type === "ICD-10") {
      if (!icdCandidates.some(c => c.code === code.code)) {
        setIcdCandidates([...icdCandidates, code]);
      }
    } else {
      if (!cptCandidates.some(c => c.code === code.code)) {
        setCptCandidates([...cptCandidates, code]);
      }
    }

    // Select the code
    if (!selectedCodes.some(c => c.code === code.code && c.type === code.type)) {
      setSelection([...selectedCodes, code]);
    }

    // Do not clear search results to allow multiple selections
    // setSearchResults([]);
    // setSearchQuery("");
  };

  const handleRemoveCode = (code: MedicalCode) => {
    setSelection(selectedCodes.filter((c) => !(c.code === code.code && c.type === code.type)));
  };

  const CandidateCard = ({ code, isSelected, onSelect }: {
    code: MedicalCode;
    isSelected: boolean;
    onSelect: () => void;
  }) => (
    <div
      onClick={onSelect}
      className={`rounded-lg border-2 p-4 cursor-pointer transition-all ${isSelected
        ? "border-blue-500 bg-blue-50 shadow-md"
        : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm"
        }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge variant={isSelected ? "info" : "neutral"} size="sm">
            {code.code}
          </Badge>
          {typeof code.confidence === 'number' && (
            <span className="text-xs text-slate-500">
              {code.confidence.toFixed(0)}% confidence
            </span>
          )}
        </div>
        {isSelected && (
          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
      <p className="text-sm font-medium text-slate-900 mb-1">{code.description}</p>
      {code.category && (
        <p className="text-xs text-slate-500">{code.category}</p>
      )}
    </div>
  );

  return (
    <Card className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Medical Codes</h3>
          <p className="text-sm text-slate-600">
            AI-generated codes from the SOAP note. Select the codes you want to apply.
          </p>
        </div>
        <Button onClick={generateCodes} loading={loading} disabled={loading}>
          {loading ? "Finding codes..." : "Find Codes"}
        </Button>
      </div>

      {hasGenerated && icdCandidates.length === 0 && cptCandidates.length === 0 && (
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
            The AI couldn&apos;t find matching codes. Try manually searching for codes below.
          </p>
        </div>
      )}

      {(icdCandidates.length > 0 || cptCandidates.length > 0) && (
        <div className="space-y-6">
          {/* ICD-10 Candidates */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                ICD-10 Diagnosis Codes
              </h4>
              <span className="text-xs text-slate-500">
                {selectedCodes.filter(c => c.type === "ICD-10").length} selected
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {icdCandidates.map((code) => (
                <CandidateCard
                  key={`${code.type}-${code.code}`}
                  code={code}
                  isSelected={selectedCodes.some(c => c.code === code.code && c.type === code.type)}
                  onSelect={() => handleSelectCandidate(code)}
                />
              ))}
            </div>
          </div>

          {/* CPT Candidates */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                CPT Procedure Codes
              </h4>
              <span className="text-xs text-slate-500">
                {selectedCodes.filter(c => c.type === "CPT").length} selected
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {cptCandidates.map((code) => (
                <CandidateCard
                  key={`${code.type}-${code.code}`}
                  code={code}
                  isSelected={selectedCodes.some(c => c.code === code.code && c.type === code.type)}
                  onSelect={() => handleSelectCandidate(code)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Manual Search */}
      <div className="border-t border-slate-200 pt-6">
        <h4 className="text-sm font-semibold text-slate-700 mb-3">Manual Code Search</h4>
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
          <Button onClick={handleSearch} loading={searching} disabled={searching}>
            Search
          </Button>
        </div>

        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-slate-500 mb-2">{searchResults.length} results found</p>
            {searchResults.map((code) => {
              const isAdded = selectedCodes.some(c => c.code === code.code && c.type === code.type);
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
                    onClick={() => !isAdded && handleAddFromSearch(code)}
                    disabled={isAdded}
                    className={isAdded ? "opacity-50 cursor-not-allowed" : ""}
                  >
                    {isAdded ? "Added" : "Add"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Codes List */}
      {selectedCodes.length > 0 && (
        <div className="border-t border-slate-200 pt-6">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Selected Codes</h4>
          <div className="space-y-2">
            {selectedCodes.map((code) => (
              <div
                key={`${code.type}-${code.code}`}
                className="flex items-center justify-between p-3 rounded-lg border border-blue-200 bg-blue-50"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="info" size="sm">{code.code}</Badge>
                    <Badge variant={code.type === "ICD-10" ? "neutral" : "info"} size="sm" className="uppercase">
                      {code.type || "Unknown"}
                    </Badge>
                    <span className="text-sm font-medium text-slate-900">{code.description}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveCode(code)}
                  className="text-slate-400 hover:text-red-600 transition-colors"
                  title="Remove code"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
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
