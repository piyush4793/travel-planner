import { memo } from "react";

type Props = {
  /** All experience tags this destination can actually deliver. */
  options: string[];
  /** Currently focused tags. */
  selected: string[];
  onToggle: (exp: string) => void;
  onClear: () => void;
};

/**
 * The "Focus" experience chips — the shared shaping lever that steers an
 * itinerary toward what the traveller is into. Used by each stop of the Route
 * Canvas Adjust drawer, so the chip behaviour reads identically everywhere
 * (DRY). Purely presentational — the caller owns the state (`usePlanBuilder`
 * or `useTripPlanner`).
 *
 * A stop can inherit the trip-level vibe seed, which may include tags this
 * destination can't deliver, so the "Clear (N)" count reflects only the tags
 * that are actually selectable here (`selected ∩ options`) — i.e. the lit
 * chips — rather than the raw `selected` length.
 */
function FocusChipsInner({ options, selected, onToggle, onClear }: Props) {
  const activeCount = selected.reduce((n, exp) => (options.includes(exp) ? n + 1 : n), 0);
  return (
    <>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="min-w-0 text-[11px] text-ink-2">Shapes the itinerary toward what you pick.</p>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="focus-ring-emerald -my-1 inline-flex min-h-[32px] shrink-0 items-center rounded px-1.5 text-[11px] font-semibold text-ink-2 transition-colors hover:text-emerald-800"
          >
            Clear ({activeCount})
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((exp) => {
          const active = selected.includes(exp);
          return (
            <button
              key={exp}
              type="button"
              onClick={() => onToggle(exp)}
              aria-pressed={active}
              className={`focus-ring-emerald min-h-[32px] rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
                active
                  ? "border-emerald-700 bg-emerald-700 text-white shadow-sm"
                  : "border-line bg-white text-ink-1 hover:border-emerald-500 hover:text-emerald-800"
              }`}
            >
              {exp}
            </button>
          );
        })}
      </div>
    </>
  );
}

const FocusChips = memo(FocusChipsInner);
export default FocusChips;
