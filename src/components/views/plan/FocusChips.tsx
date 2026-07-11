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
 * itinerary toward what the traveller is into. Used by the single-country
 * `ShapeRail` and by each stop of the multi-country Route Canvas, so the chip
 * behaviour reads identically everywhere (DRY). Purely presentational — the
 * caller owns the state (`usePlanBuilder` or `useTripPlanner`).
 */
function FocusChipsInner({ options, selected, onToggle, onClear }: Props) {
  return (
    <>
      <p className="mb-2 text-[11px] text-[#6f6a5d]">Shapes the itinerary toward what you pick.</p>
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
                  : "border-[#e4dece] bg-white text-[#1e2a25] hover:border-emerald-500 hover:text-emerald-800"
              }`}
            >
              {exp}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="focus-ring-emerald mt-2 rounded text-[11px] font-semibold text-[#a09a89] transition-colors hover:text-[#6f6a5d]"
        >
          Clear ({selected.length})
        </button>
      )}
    </>
  );
}

const FocusChips = memo(FocusChipsInner);
export default FocusChips;
