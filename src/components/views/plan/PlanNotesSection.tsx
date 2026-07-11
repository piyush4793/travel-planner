import { memo, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  notes: string;
  onSave: (notes: string) => void;
};

const MAX = 4000;

/**
 * Debounced destination notes editor for the plan workspace's right rail. Mirrors
 * the Country Panel notes behaviour (400ms debounce + blur flush, 4,000 char cap,
 * a "✓ Saved" flash) in the luxury theme, and re-seeds when the destination
 * changes so the rail always reflects the active plan's notes.
 */
function PlanNotesSectionInner({ notes, onSave }: Props) {
  const [value, setValue] = useState(notes);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const savedTimer = useRef<number | null>(null);
  const debounce = useRef<number | null>(null);

  useEffect(() => { setValue(notes); }, [notes]);

  useEffect(() => () => {
    if (debounce.current) window.clearTimeout(debounce.current);
    if (savedTimer.current) window.clearTimeout(savedTimer.current);
  }, []);

  const flashSaved = () => {
    setSaved(true);
    if (savedTimer.current) window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setSaved(false), 2000);
  };

  const handleChange = (next: string) => {
    setValue(next);
    if (debounce.current) window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => { onSave(next); flashSaved(); }, 400);
  };

  const handleBlur = () => {
    if (debounce.current) window.clearTimeout(debounce.current);
    onSave(value);
    flashSaved();
  };

  const textareaClass =
    "focus-ring-emerald w-full resize-none rounded-xl border border-line bg-surface-1 text-[13px] leading-relaxed text-ink-1 outline-none transition-colors placeholder:text-ink-4 focus:border-emerald-400";

  const savedFlash = (
    <span className={`text-[11px] font-medium text-emerald-600 transition-opacity duration-300 ${saved ? "opacity-100" : "opacity-0"}`}>
      ✓ Saved
    </span>
  );

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] text-ink-4">Auto-saved as you type</span>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="focus-ring-emerald flex min-h-[32px] items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
          aria-label="Expand notes"
          title="Expand notes"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 2h4v4M6 14H2v-4M14 2L9 7M2 14l5-5" />
          </svg>
          Expand
        </button>
      </div>
      <textarea
        className={`${textareaClass} px-3 py-2.5`}
        rows={6}
        maxLength={MAX}
        placeholder="Jot down ideas, reminders, must-dos…"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
      />
      <div className="mt-1.5 flex items-center justify-between">
        {savedFlash}
        <span className="text-[11px] text-ink-4">{value.length.toLocaleString()} / 4,000</span>
      </div>

      {expanded && createPortal(
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-1/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setExpanded(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Expanded notes"
          onKeyDown={(e) => { if (e.key === "Escape") setExpanded(false); }}
        >
          <div className="flex h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-line bg-white shadow-2xl sm:h-[80vh] sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line bg-surface-2 px-5 py-3">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-800">Notes · private to you</h3>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="focus-ring-emerald flex min-h-[32px] min-w-[32px] items-center justify-center rounded text-xl leading-none text-ink-4 hover:text-ink-1"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="flex flex-1 flex-col p-5">
              <textarea
                className={`${textareaClass} flex-1 px-4 py-3 text-sm`}
                maxLength={MAX}
                placeholder="Jot down ideas, reminders, must-dos…"
                value={value}
                onChange={(e) => handleChange(e.target.value)}
                onBlur={handleBlur}
                autoFocus
              />
            </div>
            <div className="flex items-center justify-between border-t border-line bg-surface-2 px-5 py-3">
              {savedFlash}
              <span className="text-[11px] text-ink-4">{value.length.toLocaleString()} / 4,000</span>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

const PlanNotesSection = memo(PlanNotesSectionInner);
export default PlanNotesSection;
