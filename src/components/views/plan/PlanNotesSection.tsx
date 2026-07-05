import { memo, useEffect, useRef, useState } from "react";

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

  return (
    <div>
      <textarea
        className="focus-ring-emerald w-full resize-none rounded-xl border border-[#e4dece] bg-[#faf8f2] px-3 py-2.5 text-[13px] leading-relaxed text-[#2c2a24] outline-none transition-colors placeholder:text-[#b3ad9d] focus:border-emerald-400"
        rows={6}
        maxLength={MAX}
        placeholder="Jot down ideas, reminders, must-dos…"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
      />
      <div className="mt-1.5 flex items-center justify-between">
        <span className={`text-[11px] font-medium text-emerald-600 transition-opacity duration-300 ${saved ? "opacity-100" : "opacity-0"}`}>
          ✓ Saved
        </span>
        <span className="text-[11px] text-[#a8a293]">{value.length.toLocaleString()} / 4,000</span>
      </div>
    </div>
  );
}

const PlanNotesSection = memo(PlanNotesSectionInner);
export default PlanNotesSection;
