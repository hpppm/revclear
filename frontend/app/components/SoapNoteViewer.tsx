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

interface SoapNoteViewerProps {
  soap?: SoapNote | null;
  isEditing?: boolean;
  onEditChange?: (field: keyof SoapNote, value: string) => void;
}

export default function SoapNoteViewer({ soap, isEditing = false, onEditChange }: SoapNoteViewerProps) {
  return (
    <div className="space-y-4 rounded-xl border border-rose-100 bg-gradient-to-b from-rose-50 to-white p-4 shadow-sm">
      {sectionOrder.map((key) => {
        const content = soap?.[key] || "";
        const items = listify(content);

        return (
          <div
            key={key}
            className="grid grid-cols-[64px_1fr] gap-3 p-4 bg-white border border-rose-100 rounded-xl shadow-sm"
          >
            <div className="flex flex-col items-center justify-center rounded-lg bg-rose-50 px-2 text-rose-600">
              <span className="text-2xl font-bold">{sectionInitial[key]}</span>
            </div>
            <div className="space-y-2 w-full">
              <p className="text-sm font-semibold text-rose-700">
                {sectionLabels[key]}
              </p>

              {isEditing ? (
                <textarea
                  value={content}
                  onChange={(e) => onEditChange?.(key, e.target.value)}
                  className="w-full min-h-[100px] rounded-lg border border-rose-200 p-3 text-sm text-slate-800 focus:border-rose-400 focus:ring-1 focus:ring-rose-400 outline-none"
                  placeholder={`Enter ${sectionLabels[key]}...`}
                />
              ) : (
                <div className="rounded-lg border border-rose-100 bg-rose-50/60 px-4 py-3 space-y-1 text-sm text-slate-800">
                  {items.length === 0 ? (
                    <p className="text-slate-500">No data found.</p>
                  ) : (
                    items.map((line, idx) => (
                      <div key={idx} className="flex gap-2">
                        <span className="text-rose-500 font-semibold">•</span>
                        <span className="whitespace-pre-wrap">{line}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
