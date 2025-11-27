// Mark as client so it can render inside client-only pages.
"use client";

type SoapNote = {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
};

function listify(text?: string) {
  if (!text) return [];
  return text
    .split(/\r?\n+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

const sectionOrder: Array<keyof SoapNote> = [
  "subjective",
  "objective",
  "assessment",
  "plan",
];

const sectionLabels: Record<keyof SoapNote, string> = {
  subjective: "Subjective",
  objective: "Objective",
  assessment: "Assessment",
  plan: "Plan",
};

const sectionInitial: Record<keyof SoapNote, string> = {
  subjective: "S",
  objective: "O",
  assessment: "A",
  plan: "P",
};

export default function SoapNoteViewer({ soap }: { soap?: SoapNote | null }) {
  return (
    <div className="space-y-4">
      {sectionOrder.map((key) => {
        const items = listify(soap?.[key]);
        return (
          <div
            key={key}
            className="grid grid-cols-[64px_1fr] gap-3 p-4 bg-white border border-slate-200 rounded-xl shadow-sm"
          >
            <div className="flex flex-col items-center text-rose-600">
              <span className="text-2xl font-bold">{sectionInitial[key]}</span>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-800">
                {sectionLabels[key]}
              </p>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 space-y-1 text-sm text-slate-800">
                {items.length === 0 ? (
                  <p className="text-slate-500">No data found.</p>
                ) : (
                  items.map((line, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-rose-500 font-semibold">-</span>
                      <span className="whitespace-pre-wrap">{line}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
