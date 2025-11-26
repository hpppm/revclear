'use client';

import React, { useEffect, useMemo, useState } from "react";

export type MedicalCode = {
  id: string;
  type: "CPT" | "ICD-10";
  code: string;
  description: string;
  category: string;
  confidence: number; // 0-100 scale
  source?: string;
};

type SoapNote = {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
};

type MedicalCodesViewerProps = {
  soap?: SoapNote | null;
  encounterId?: string | null;
  onCodesChange?: (codes: MedicalCode[]) => void;
  defaultCodes?: MedicalCode[];
};

const normalizeSoap = (soap?: SoapNote | null) => {
  if (!soap) return "";
  return [soap.subjective, soap.objective, soap.assessment, soap.plan]
    .filter(Boolean)
    .join(" ");
};

const seededMockCodes = (soapText: string, specialty: string): MedicalCode[] => {
  const lower = soapText.toLowerCase();
  const mentionsShoulder = lower.includes("shoulder") || lower.includes("rotator");
  const mentionsBack = lower.includes("back") || lower.includes("lumbar");
  const mentionsSpeech = lower.includes("speech") || lower.includes("aphasia") || lower.includes("stutter");
  const mentionsAnxiety = lower.includes("anxiety") || lower.includes("panic");
  const mentionsDepression = lower.includes("depression") || lower.includes("mood");

  const shared = {
    mental_health: {
      icd: mentionsAnxiety
        ? { code: "F41.1", description: "Generalized anxiety disorder" }
        : mentionsDepression
        ? { code: "F32.9", description: "Major depressive disorder, single episode, unspecified" }
        : { code: "F41.9", description: "Anxiety disorder, unspecified" },
      icd2: { code: "Z13.89", description: "Encounter for screening, mental health" },
      cpt: { code: "90791", description: "Psychiatric diagnostic evaluation" },
      cpt2: { code: "90834", description: "Psychotherapy, 45 minutes with patient" },
      label: "Mental Health",
    },
    physical_therapy: {
      icd: mentionsShoulder
        ? { code: "M75.101", description: "Unspecified rotator cuff tear or rupture" }
        : mentionsBack
        ? { code: "M54.50", description: "Low back pain, unspecified" }
        : { code: "M62.81", description: "Muscle weakness (generalized)" },
      icd2: { code: "Z74.09", description: "Limited mobility" },
      cpt: { code: "97161", description: "PT evaluation, low complexity" },
      cpt2: { code: "97110", description: "Therapeutic exercises" },
      label: "Physical Therapy",
    },
    speech_therapy: {
      icd: mentionsSpeech
        ? { code: "R47.01", description: "Aphasia" }
        : { code: "F80.0", description: "Phonological disorder" },
      icd2: { code: "R48.2", description: "Apraxia" },
      cpt: { code: "92523", description: "Speech sound language comprehension eval" },
      cpt2: { code: "92507", description: "Speech/hearing therapy" },
      label: "Speech Therapy",
    },
  } as const;

  const bundle = shared[specialty as keyof typeof shared] || shared.mental_health;
  const specialtyLabel = bundle.label;

  return [
    {
      id: "icd-1",
      type: "ICD-10",
      code: bundle.icd.code,
      description: bundle.icd.description,
      category: `${specialtyLabel} / Diagnosis`,
      confidence: 85,
      source: "SOAP assessment",
    },
    {
      id: "icd-2",
      type: "ICD-10",
      code: bundle.icd2.code,
      description: bundle.icd2.description,
      category: `${specialtyLabel} / Secondary`,
      confidence: 72,
      source: "SOAP assessment",
    },
    {
      id: "cpt-1",
      type: "CPT",
      code: bundle.cpt.code,
      description: bundle.cpt.description,
      category: `${specialtyLabel} / Treatment`,
      confidence: 78,
      source: "Visit complexity",
    },
    {
      id: "cpt-2",
      type: "CPT",
      code: bundle.cpt2.code,
      description: bundle.cpt2.description,
      category: `${specialtyLabel} / Plan`,
      confidence: 65,
      source: "SOAP plan",
    },
  ];
};

const mockGenerateCodes = async (
  soapText: string,
  encounterId?: string | null,
  specialty?: string
): Promise<MedicalCode[]> => {
  // Stubbed API; swap with real endpoint when available
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!soapText.trim()) {
        reject(new Error("SOAP content required to generate codes."));
        return;
      }
      resolve(
        seededMockCodes(soapText, specialty || "mental_health").map((code) => ({
          ...code,
          id: `${code.id}-${encounterId || "local"}-${Date.now()}`,
        }))
      );
    }, 700);
  });
};

const SectionHeader = ({
  title,
  count,
}: {
  title: string;
  count: number;
}) => (
  <div className="flex items-center justify-between">
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <p className="text-lg font-semibold text-slate-900">
        {count} {count === 1 ? "code" : "codes"}
      </p>
    </div>
  </div>
);

const CodeRow = ({
  code,
  onChange,
  onRemove,
}: {
  code: MedicalCode;
  onChange: (code: MedicalCode) => void;
  onRemove: () => void;
}) => {
  const update = (partial: Partial<MedicalCode>) =>
    onChange({ ...code, ...partial });

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {code.type}
          </span>
          <input
            value={code.code}
            onChange={(e) => update({ code: e.target.value })}
            className="text-base font-semibold text-slate-900 border border-slate-200 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-sm text-rose-600 hover:text-rose-700"
        >
          Remove
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-600">Description</span>
          <input
            value={code.description}
            onChange={(e) => update({ description: e.target.value })}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Describe the procedure or diagnosis"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-600">Category</span>
          <input
            value={code.category}
            onChange={(e) => update({ category: e.target.value })}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Category"
          />
        </label>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>Confidence</span>
          <span className="font-semibold text-slate-800">
            {code.confidence.toFixed(0)}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={code.confidence}
          onChange={(e) => update({ confidence: Number(e.target.value) })}
          className="accent-blue-600"
        />
        {code.source && (
          <p className="text-xs text-slate-500">Source: {code.source}</p>
        )}
      </div>
    </div>
  );
};

const MedicalCodesViewer = ({
  soap,
  encounterId,
  onCodesChange,
  defaultCodes = [],
}: MedicalCodesViewerProps) => {
  const specialties = [
    { value: "mental_health", label: "Mental Health" },
    { value: "physical_therapy", label: "Physical Therapy" },
    { value: "speech_therapy", label: "Speech Therapy" },
  ];

  const [codes, setCodes] = useState<MedicalCode[]>(defaultCodes);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [specialty, setSpecialty] = useState<string>(specialties[0].value);

  const soapText = useMemo(() => normalizeSoap(soap), [soap]);

  const cptCodes = useMemo(
    () => codes.filter((c) => c.type === "CPT"),
    [codes]
  );
  const icdCodes = useMemo(
    () => codes.filter((c) => c.type === "ICD-10"),
    [codes]
  );

  useEffect(() => {
    if (onCodesChange) {
      onCodesChange(codes);
    }
  }, [codes, onCodesChange]);

  const generateCodes = async () => {
    setLoading(true);
    setError(null);
    try {
      const generated = await mockGenerateCodes(soapText, encounterId, specialty);
      setCodes(generated);
    } catch (err: any) {
      setError(err?.message || "Failed to generate codes.");
    } finally {
      setLoading(false);
    }
  };

  const addCode = (type: MedicalCode["type"]) => {
    setCodes((prev) => [
      ...prev,
      {
        id: `${type}-${Date.now()}`,
        type,
        code: "",
        description: "",
        category: "",
        confidence: 50,
      },
    ]);
  };

  const updateCode = (id: string, updated: MedicalCode) => {
    setCodes((prev) => prev.map((code) => (code.id === id ? updated : code)));
  };

  const removeCode = (id: string) => {
    setCodes((prev) => prev.filter((code) => code.id !== id));
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-slate-500">Billing readiness</p>
          <h2 className="text-2xl font-bold text-slate-900">
            CPT & ICD-10 codes
          </h2>
          <p className="text-sm text-slate-600">
            Generate from the SOAP note, then fine-tune or remove codes before
            creating claims. Supported specialties: Mental Health, Physical Therapy, Speech Therapy.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-600">
            Specialty
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="ml-2 rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {specialties.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={generateCodes}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent" />
                Generating...
              </>
            ) : (
              "Generate codes"
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">SOAP context</p>
        <p className="text-slate-600">
          {soapText || "No SOAP note available. Generate SOAP before coding."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <SectionHeader title="ICD-10 (Diagnosis codes)" count={icdCodes.length} />
          {icdCodes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
              No ICD-10 codes yet.
            </div>
          ) : (
            icdCodes.map((code) => (
              <CodeRow
                key={code.id}
                code={code}
                onChange={(updated) => updateCode(code.id, updated)}
                onRemove={() => removeCode(code.id)}
              />
            ))
          )}
          <button
            type="button"
            onClick={() => addCode("ICD-10")}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            + Add ICD-10 code
          </button>
        </div>

        <div className="space-y-3">
          <SectionHeader title="CPT (Procedure codes)" count={cptCodes.length} />
          {cptCodes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
              No CPT codes yet.
            </div>
          ) : (
            cptCodes.map((code) => (
              <CodeRow
                key={code.id}
                code={code}
                onChange={(updated) => updateCode(code.id, updated)}
                onRemove={() => removeCode(code.id)}
              />
            ))
          )}
          <button
            type="button"
            onClick={() => addCode("CPT")}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            + Add CPT code
          </button>
        </div>
      </div>
    </section>
  );
};

export default MedicalCodesViewer;
