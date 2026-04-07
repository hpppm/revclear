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

const sectionColors: Record<keyof SoapNote, { tag: string; label: string; border: string; focus: string }> = {
  subjective: {
    tag:    "bg-blue-100 text-blue-800",
    label:  "text-blue-700",
    border: "border-blue-200",
    focus:  "focus:border-blue-400 focus:ring-blue-400",
  },
  objective: {
    tag:    "bg-green-100 text-green-800",
    label:  "text-green-700",
    border: "border-green-200",
    focus:  "focus:border-green-400 focus:ring-green-400",
  },
  assessment: {
    tag:    "bg-amber-100 text-amber-800",
    label:  "text-amber-700",
    border: "border-amber-200",
    focus:  "focus:border-amber-400 focus:ring-amber-400",
  },
  plan: {
    tag:    "bg-purple-100 text-purple-800",
    label:  "text-purple-700",
    border: "border-purple-200",
    focus:  "focus:border-purple-400 focus:ring-purple-400",
  },
};

interface SoapNoteViewerProps {
  soap?: SoapNote | null;
  isEditing?: boolean;
  onEditChange?: (field: keyof SoapNote, value: string) => void;
}

export default function SoapNoteViewer({ soap, isEditing = false, onEditChange }: SoapNoteViewerProps) {
  return (
    <div className="flex flex-col gap-3">
      {sectionOrder.map((key) => {
        const content = soap?.[key] || "";
        const items = listify(content);
        const c = sectionColors[key];

        return (
          <div
            key={key}
            className={`flex items-start gap-3 bg-white border ${c.border} rounded-xl px-4 py-3 shadow-sm`}
          >
            {/* Colored letter tag */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${c.tag}`}>
              {sectionInitial[key]}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-bold uppercase tracking-widest mb-1.5 ${c.label}`}>
                {sectionLabels[key]}
              </p>

              {isEditing ? (
                <textarea
                  value={content}
                  onChange={(e) => onEditChange?.(key, e.target.value)}
                  className={`w-full min-h-[80px] rounded-lg border ${c.border} p-2.5 text-sm text-slate-800 outline-none focus:ring-1 ${c.focus}`}
                  placeholder={`Enter ${sectionLabels[key]}...`}
                />
              ) : (
                <div className="text-sm text-slate-700 leading-relaxed">
                  {items.length === 0 ? (
                    <p className="text-slate-400 italic">No data found.</p>
                  ) : (
                    items.map((line, idx) => (
                      <div key={idx} className="flex gap-2 mb-1">
                        <span className={`font-bold mt-0.5 ${c.label}`}>•</span>
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
