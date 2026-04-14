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

const sectionStyle = {
  tag:    "bg-slate-800 text-white",
  label:  "text-slate-500",
  border: "border-slate-200",
  focus:  "focus:border-slate-400 focus:ring-slate-400",
};

interface SoapNoteViewerProps {
  soap?: SoapNote | null;
  isEditing?: boolean;
  onEditChange?: (field: keyof SoapNote, value: string) => void;
}

export default function SoapNoteViewer({ soap, isEditing = false, onEditChange }: SoapNoteViewerProps) {
  return (
    <div className={`grid gap-4 ${isEditing ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
      {sectionOrder.map((key) => {
        const content = soap?.[key] || "";
        const items = listify(content);
        const c = sectionStyle;

        return (
          <div
            key={key}
            className={`flex items-start gap-3 bg-white border ${c.border} rounded-xl px-4 py-4 shadow-sm`}
          >
            {/* Letter badge */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold ${c.tag}`}>
              {sectionInitial[key]}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <p className={`text-xs font-semibold uppercase tracking-widest ${c.label}`}>
                  {sectionLabels[key]}
                </p>
                {!isEditing && items.length === 0 && (
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Empty</span>
                )}
              </div>

              {isEditing ? (
                <textarea
                  id={`soap-${key}`}
                  name={`soap-${key}`}
                  value={content}
                  onChange={(e) => onEditChange?.(key, e.target.value)}
                  className={`w-full min-h-[96px] rounded-lg border ${c.border} p-3 text-sm text-slate-800 leading-relaxed outline-none focus:ring-1 ${c.focus}`}
                  placeholder={`Enter ${sectionLabels[key]}...`}
                />
              ) : (
                <div className="text-sm text-slate-700">
                  {items.length === 0 ? (
                    <p className="text-slate-400 italic">No details yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {items.map((line, idx) => (
                        <li key={idx} className="flex gap-2.5 leading-relaxed">
                          <span className="flex-shrink-0 text-slate-400 mt-0.5">•</span>
                          <span className="whitespace-pre-wrap">{line}</span>
                        </li>
                      ))}
                    </ul>
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
