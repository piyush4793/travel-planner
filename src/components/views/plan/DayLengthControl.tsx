import { useEffect, useMemo, useState } from "react";
import { useConfirm } from "../../shared/ConfirmDialog";
import { getRangePercent } from "../../country/panel/utils";

type Props = {
  /** Committed day count driving the live plan. */
  days: number;
  maxDays: number;
  /** Selection-aware recommended length (marker + reset target). */
  recommendedDays: number;
  daysPinned: boolean;
  /** Cities the user hand-picked — dropping one needs explicit confirmation. */
  handPickedCities: string[];
  /** Cities the committed plan currently visits. */
  currentCities: string[];
  /** Whether more cities are available to add than the plan currently visits. */
  moreCitiesAvailable: boolean;
  /** Pure projection of the city route at a candidate day count. */
  projectCities: (days: number) => string[];
  /** Commit a new day count (pins the slider). */
  onCommit: (days: number) => void;
  /** Clear the pin so the recommended length re-seeds. */
  onReset: () => void;
};

type Feedback = { tone: "drop" | "add" | "neutral"; text: string };

function diffCities(before: string[], after: string[]) {
  const dropped = before.filter((c) => !after.includes(c));
  const added = after.filter((c) => !before.includes(c));
  return { dropped, added };
}

function joinNames(names: string[]): string {
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

/**
 * Length control for the guided planner's Review step. Days are inferred behind
 * the scenes; this lets the user nudge the trip length with honest, live
 * consequences — inline feedback for every change, plus an explicit confirm only
 * when the change would drop a city they hand-picked (which can't be undone by
 * squeezing). Consequences are computed on release, comparing against the value
 * the user last accepted.
 */
export default function DayLengthControl({
  days,
  maxDays,
  recommendedDays,
  daysPinned,
  handPickedCities,
  currentCities,
  moreCitiesAvailable,
  projectCities,
  onCommit,
  onReset,
}: Props) {
  const [draft, setDraft] = useState(days);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [confirm, ConfirmDialog] = useConfirm();

  // Follow external day changes (auto-seed, reset, destination switch) and drop
  // stale feedback so it never describes a plan the user is no longer looking at.
  useEffect(() => {
    setDraft(days);
    setFeedback(null);
  }, [days]);

  const sliderPercent = getRangePercent(draft, maxDays);
  const recPercent = useMemo(
    () => getRangePercent(Math.min(recommendedDays, maxDays), maxDays),
    [recommendedDays, maxDays],
  );

  const describe = (next: number, projected: string[]): Feedback => {
    const { dropped, added } = diffCities(currentCities, projected);
    const delta = next - days;
    const sign = delta > 0 ? `+${delta}` : `${delta}`;
    if (dropped.length > 0) {
      return { tone: "drop", text: `${sign} days · ${joinNames(dropped)} no longer fit${dropped.length === 1 ? "s" : ""}` };
    }
    if (added.length > 0) {
      return { tone: "add", text: `${sign} days · added ${joinNames(added)}` };
    }
    if (delta > 0 && moreCitiesAvailable) {
      return { tone: "add", text: `${sign} days · room for another city — add one in Places` };
    }
    return { tone: "neutral", text: `${sign} days · more time in each place` };
  };

  const commit = async (next: number) => {
    if (next === days) return;
    const projected = projectCities(next);
    const { dropped } = diffCities(currentCities, projected);
    const droppedHandPicked = dropped.filter((c) => handPickedCities.includes(c));
    if (droppedHandPicked.length > 0) {
      const ok = await confirm({
        title: "Drop a place you picked?",
        message: `${joinNames(droppedHandPicked)} won't fit in ${next} days and will be removed from your plan.`,
        confirmLabel: "Shorten anyway",
        cancelLabel: "Keep as is",
        variant: "warning",
      });
      if (!ok) {
        setDraft(days);
        return;
      }
    }
    setFeedback(describe(next, projected));
    onCommit(next);
  };

  return (
    <div className="rounded-2xl border border-[#e4dece] bg-white p-4 shadow-[0_1px_3px_rgba(20,40,30,0.05)]">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#a09a89]">Trip length</span>
        <span>
          <span className="text-2xl font-black tracking-tight text-[#16241d]">{draft}</span>
          <span className="ml-1 text-xs font-bold text-[#a09a89]">days</span>
        </span>
      </div>

      <div className="relative pt-3">
        <input
          type="range"
          min={1}
          max={maxDays}
          value={draft}
          onChange={(e) => setDraft(Number(e.target.value))}
          onMouseUp={(e) => void commit(Number((e.target as HTMLInputElement).value))}
          onTouchEnd={(e) => void commit(Number((e.target as HTMLInputElement).value))}
          onKeyUp={(e) => void commit(Number((e.target as HTMLInputElement).value))}
          aria-label="Trip length in days"
          className="focus-ring-emerald w-full accent-emerald-700"
          style={{ background: `linear-gradient(to right, #047857 ${sliderPercent}%, #e4dece ${sliderPercent}%)` }}
        />
        <div
          className="pointer-events-none absolute -top-0.5 h-3 w-0.5 bg-[#a09a89]"
          style={{ left: `${recPercent}%` }}
          aria-hidden="true"
        />
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] font-medium text-[#a09a89]">
        <span>1 day</span>
        <span>{maxDays} days</span>
      </div>

      <div className="mt-2.5 flex min-h-[20px] items-center justify-between gap-2" aria-live="polite">
        {feedback ? (
          <span
            className={`text-[11px] font-semibold ${
              feedback.tone === "drop" ? "text-amber-600" : feedback.tone === "add" ? "text-emerald-700" : "text-[#6f6a5d]"
            }`}
          >
            {feedback.tone === "drop" ? "⚠️ " : feedback.tone === "add" ? "✨ " : "· "}
            {feedback.text}
          </span>
        ) : (
          <span className="text-[11px] font-medium text-[#a09a89]">
            {daysPinned ? "Custom length" : "✨ Auto-tuned to your choices"}
          </span>
        )}
        {daysPinned && (
          <button
            onClick={onReset}
            className="focus-ring-emerald shrink-0 rounded text-[11px] font-semibold text-emerald-700 transition-colors hover:text-emerald-900"
          >
            ↺ Reset ({recommendedDays}d)
          </button>
        )}
      </div>

      <ConfirmDialog />
    </div>
  );
}
