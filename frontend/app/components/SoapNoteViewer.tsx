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
    <div className="flex flex-col gap-4">
      {sectionOrder.map((key) => {
        const content = soap?.[key] || "";
        const items = listify(content);
        const c = sectionStyle;

        return (
          <div
            key={key}
            className={`flex items-start gap-4 bg-white border ${c.border} rounded-xl px-5 py-4 shadow-sm`}
          >
            {/* Letter badge */}
            <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${c.tag}`}>
              {sectionInitial[key]}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold uppercase tracking-widest mb-2.5 ${c.label}`}>
                {sectionLabels[key]}
              </p>

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
                    <p className="text-slate-400 italic">No data found.</p>
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
