import { useState, useMemo } from "react";
import type { Country, TravelStyle } from "../../core/types";
import { STYLE_META, TRAVEL_STYLES } from "../../core/utils/travelStyles";
import { BUDGET_BASIS_META, deriveBudgetBreakdown } from "../../core/utils/budget";
import ModalShell from "../shared/ModalShell";
import { useConfirm } from "../shared/ConfirmDialog";

const BUDGET_PATTERN = /^[₹$€£¥][\d.]+[KkLlMm](\s*[–—-]\s*[₹$€£¥][\d.]+[KkLlMm])?$/;

type Props = {
  initial: Country;
  onSave: (c: Country) => void;
  onClose: () => void;
};

export default function CountryForm({ initial, onSave, onClose }: Props) {
  const [solo, setSolo] = useState(initial.budgetBreakdown?.solo ?? "");
  const [landmark, setLandmark] = useState(initial.landmark ?? "");
  const [travelStyle, setTravelStyle] = useState<TravelStyle | undefined>(initial.travelStyle?.[0]);
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [confirm, ConfirmDialog] = useConfirm();

  const derived = useMemo(() => deriveBudgetBreakdown(solo), [solo]);
  const initialSolo = initial.budgetBreakdown?.solo ?? "";
  const isDirty = useMemo(() => {
    return solo !== initialSolo ||
      landmark !== (initial.landmark ?? "") ||
      notes !== (initial.notes ?? "") ||
      travelStyle !== initial.travelStyle?.[0];
  }, [solo, landmark, notes, travelStyle, initial, initialSolo]);

  const budgetWarning = solo.trim() && !BUDGET_PATTERN.test(solo.trim())
    ? "Expected format: ₹50K–₹1L or ₹2L"
    : "";

  function selectStyle(s: TravelStyle) {
    setTravelStyle((prev) => (prev === s ? undefined : s));
  }

  const activeStyleMeta = travelStyle ? STYLE_META[travelStyle] : undefined;

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
    const trimmedSolo = solo.trim();
    const breakdown = deriveBudgetBreakdown(trimmedSolo);
    const hasBudget = Boolean(trimmedSolo);
    onSave({
      ...initial,
      // Keep the single budget string synced to the couple basis (enrichment convention).
      budget: hasBudget ? breakdown.couple : initial.budget,
      budgetBreakdown: hasBudget ? breakdown : undefined,
      landmark: landmark.trim() || undefined,
      travelStyle: travelStyle ? [travelStyle] : undefined,
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
          {/* Budget — single per-person input; couple & family are derived */}
          <div>
            <Label>Budget estimate</Label>
            <div className="flex items-center gap-2">
              <span className="w-24 shrink-0 flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                <span aria-hidden="true">{BUDGET_BASIS_META.solo.icon}</span>
                {BUDGET_BASIS_META.solo.label}
              </span>
              <input
                id="cf-budget-solo"
                className={`input focus-ring flex-1 ${budgetWarning ? "border-amber-300" : ""}`}
                value={solo}
                onChange={(e) => setSolo(e.target.value)}
                placeholder="₹1L–₹2L"
                aria-label={`Budget ${BUDGET_BASIS_META.solo.long}`}
                aria-invalid={Boolean(budgetWarning)}
                aria-describedby={budgetWarning ? "cf-budget-warn" : "cf-budget-derived"}
              />
            </div>
            {budgetWarning && (
              <p id="cf-budget-warn" className="text-[11px] text-amber-500 mt-1 pl-[104px]">⚠ {budgetWarning}</p>
            )}
            {derived.couple && !budgetWarning && (
              <p id="cf-budget-derived" className="text-[11px] text-gray-500 mt-1.5 pl-[104px] flex items-center gap-3">
                <span className="flex items-center gap-1" title={`Budget ${BUDGET_BASIS_META.couple.long}`}>
                  <span aria-hidden="true">{BUDGET_BASIS_META.couple.icon}</span>{derived.couple}
                </span>
                <span className="flex items-center gap-1" title={`Budget ${BUDGET_BASIS_META.family4.long}`}>
                  <span aria-hidden="true">{BUDGET_BASIS_META.family4.icon}</span>{derived.family4}
                </span>
              </p>
            )}
            <p className="text-[11px] text-gray-400 mt-1.5">Enter a per-person estimate (e.g. ₹1.5L–₹3L). Couple & family totals are derived automatically. Leave blank to use built-in estimates.</p>
          </div>

          {/* Travel style — single select, drives the default trip length */}
          <div>
            <Label>Travel style</Label>
            <div className="flex gap-2" role="radiogroup" aria-label="Travel style">
              {TRAVEL_STYLES.map((s) => {
                const meta = STYLE_META[s];
                const active = travelStyle === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => selectStyle(s)}
                    role="radio"
                    aria-checked={active}
                    title={meta.description}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 min-h-[40px] rounded-xl text-xs font-bold border-2 transition-colors focus-ring ${
                      active ? meta.activeForm : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {meta.icon} {meta.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-gray-500 mt-2 min-h-[2.5rem]">
              {activeStyleMeta ? (
                <><span className="font-semibold text-gray-600">{activeStyleMeta.icon} {activeStyleMeta.label}</span> — {activeStyleMeta.description}</>
              ) : (
                "Pick a style to set the default day count when planning — you can still fine-tune with the slider."
              )}
            </p>
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
