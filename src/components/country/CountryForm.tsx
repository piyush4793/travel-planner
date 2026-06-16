import { useState, useMemo } from "react";
import type { Country, TravelStyle } from "../../core/types";
import { STYLE_META, TRAVEL_STYLES } from "../../core/utils/travelStyles";
import Tooltip from "../shared/Tooltip";
import ModalShell from "../shared/ModalShell";
import { useConfirm } from "../shared/ConfirmDialog";

const BUDGET_PATTERN = /^[₹$€£¥][\d.]+[KkLlMm](\s*[–—-]\s*[₹$€£¥][\d.]+[KkLlMm])?$/;

type Props = {
  initial: Country;
  onSave: (c: Country) => void;
  onClose: () => void;
};

export default function CountryForm({ initial, onSave, onClose }: Props) {
  const [budget, setBudget] = useState(initial.budget ?? "");
  const [landmark, setLandmark] = useState(initial.landmark ?? "");
  const [travelStyle, setTravelStyle] = useState<TravelStyle[]>(initial.travelStyle ?? []);
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [confirm, ConfirmDialog] = useConfirm();

  const isDirty = useMemo(() => {
    return budget !== (initial.budget ?? "") ||
      landmark !== (initial.landmark ?? "") ||
      notes !== (initial.notes ?? "") ||
      JSON.stringify(travelStyle) !== JSON.stringify(initial.travelStyle ?? []);
  }, [budget, landmark, notes, travelStyle, initial]);

  const budgetWarning = budget.trim() && !BUDGET_PATTERN.test(budget.trim())
    ? "Expected format: ₹50K–₹1L or ₹2L"
    : "";

  function toggleStyle(s: TravelStyle) {
    setTravelStyle((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  async function handleClose() {
    if (isDirty) {
      const ok = await confirm({
        title: "Discard changes?",
        message: "You have unsaved changes that will be lost.",
        confirmLabel: "Discard",
        cancelLabel: "Keep editing",
        variant: "warning",
      });
      if (!ok) return;
    }
    onClose();
  }

  function handleSubmit() {
    onSave({
      ...initial,
      budget: budget.trim() || initial.budget,
      landmark: landmark.trim() || undefined,
      travelStyle: travelStyle.length ? travelStyle : undefined,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <>
    <ModalShell
      open={true}
      onClose={handleClose}
      label={`Edit ${initial.name}`}
      className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col"
      backdropClassName="bg-black/50"
    >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">
            {`Customize — ${initial.name}`}
          </h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none min-h-[32px] min-w-[32px] flex items-center justify-center focus-ring rounded" aria-label="Close">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Budget */}
          <div>
            <Label htmlFor="cf-budget">Budget estimate</Label>
            <input
              id="cf-budget"
              className={`input focus-ring ${budgetWarning ? "border-amber-300" : ""}`}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="₹2L–₹4L"
              aria-describedby={budgetWarning ? "cf-budget-warn" : "cf-budget-hint"}
            />
            {budgetWarning ? (
              <p id="cf-budget-warn" className="text-[11px] text-amber-500 mt-1">⚠ {budgetWarning}</p>
            ) : (
              <p id="cf-budget-hint" className="text-[11px] text-gray-400 mt-1">e.g. ₹50K, ₹1.5L–₹3L, $2K–$5K</p>
            )}
          </div>

          {/* Travel style */}
          <div>
            <Label>Travel style</Label>
            <div className="flex gap-2">
              {TRAVEL_STYLES.map((s) => {
                const meta = STYLE_META[s];
                return (
                  <div key={s} className="flex-1 flex flex-col items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleStyle(s)}
                      aria-pressed={travelStyle.includes(s)}
                      className={`w-full flex items-center justify-center gap-1.5 py-2.5 min-h-[36px] rounded-xl text-xs font-bold border-2 transition-colors focus-ring ${
                        travelStyle.includes(s) ? meta.activeForm : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {meta.icon} {meta.label}
                    </button>
                    <Tooltip text={meta.description} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Landmark */}
          <div>
            <Label htmlFor="cf-landmark">Landmark image (optional)</Label>
            <input
              id="cf-landmark"
              className="input focus-ring"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="Wikipedia title or image URL, e.g. Mount Fuji"
              aria-describedby="cf-landmark-hint"
            />
            <p id="cf-landmark-hint" className="text-[11px] text-gray-400 mt-1">
              Wikipedia article name for the card image. Or paste a direct image URL.
            </p>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="cf-notes">Notes (optional)</Label>
            <textarea
              id="cf-notes"
              className="input resize-none focus-ring"
              rows={3}
              maxLength={4000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Personal notes, reminders, or things to research..."
              aria-describedby="cf-notes-hint"
            />
            <p id="cf-notes-hint" className="text-[11px] text-gray-400 mt-1 text-right">{notes.length.toLocaleString()} / 4,000</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button onClick={handleClose} className="px-4 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100 focus-ring min-h-[36px]">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 text-sm rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 focus-ring min-h-[36px]"
          >
            Save changes
          </button>
        </div>
    </ModalShell>
    <ConfirmDialog />
    </>
  );
}

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">{children}</label>;
}
