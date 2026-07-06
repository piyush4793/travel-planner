import { useState } from "react";
import type { Country } from "../../../core/types";
import type { DestinationSource } from "../../../core/trip/destinationSource";
import type { TripPlan } from "../../../core/utils/tripPlans";
import { BUDGET_BASIS_ORDER, BUDGET_BASIS_META, type BudgetBasis } from "../../../core/utils/budget";
import PillGroup from "../../shared/PillGroup";
import PlanProgressSummary from "./PlanProgressSummary";
import PlanRouteSummary from "./PlanRouteSummary";

/**
 * Default number of vibe pills to reveal before the rest collapse behind a
 * "+N more" toggle. This is a *UX preference*, not a layout safeguard: the pill
 * area is always height-bounded and scrollable (see `render`), so any count —
 * a raised cap, or `Number.POSITIVE_INFINITY` to disable capping entirely —
 * stays contained without pushing the rest of the step off-screen. Ten is a
 * balanced 2–3 rows; any *selected* tag stays visible even past the cap.
 */
const DEFAULT_VIBE_CAP = 10;

type Props = {
  /** Ordered trip selection — one unit is single-destination, many is a route. */
  selection: Country[];
  /** Scope source (international today; domestic later) — drives the summary. */
  source: DestinationSource;
  budgetBasis: BudgetBasis;
  setBudgetBasis: (b: BudgetBasis) => void;
  /** Vibe tags for the selection — a single unit's tags, or the multi-unit union. */
  experiences: string[];
  selectedExperiences: string[];
  onToggleExperience: (exp: string) => void;
  onClearExperiences: () => void;
  /**
   * How many vibe pills to reveal before collapsing behind "+N more". Defaults
   * to {@link DEFAULT_VIBE_CAP}; pass a larger number to widen it or
   * `Number.POSITIVE_INFINITY` to render every tag (the scroll container keeps
   * the layout safe regardless).
   */
  visibleCap?: number;
  /** Live single-destination plan for immediate feedback (null while loading). */
  plan: TripPlan | null;
};

/**
 * The Basics step surface. It molds entirely from the data it's handed rather
 * than hardcoding a country trip:
 *
 * - Party size — always (every scope + shape needs it).
 * - Vibe pills — whenever the selection offers experience tags. For a single
 *   unit these are its own tags; for a multi-unit route they are the union of
 *   what every chosen unit offers (resolved upstream).
 * - Summary — a route timeline for a multi-unit trip, or the live plan readout
 *   for a single unit.
 *
 * A future domestic scope reuses this untouched by passing city units and a
 * domestic source; nothing here assumes "country".
 */
export default function PlanBasicsStep({
  selection,
  source,
  budgetBasis,
  setBudgetBasis,
  experiences,
  selectedExperiences,
  onToggleExperience,
  onClearExperiences,
  visibleCap = DEFAULT_VIBE_CAP,
  plan,
}: Props) {
  const isMulti = selection.length > 1;
  const showVibe = experiences.length > 0;

  // Progressive disclosure: reveal `visibleCap` pills, collapse the rest behind a
  // toggle. Order stays stable (no reflow-on-select) and a *selected* tag is
  // never hidden, even past the cap. The scroll container below — not this cap —
  // is what actually guards the layout, so raising `visibleCap` (or setting it to
  // Infinity) never risks overflow.
  const [vibeExpanded, setVibeExpanded] = useState(false);
  const overflow = experiences.length > visibleCap;
  const visibleExperiences =
    vibeExpanded || !overflow
      ? experiences
      : experiences.filter((exp, i) => i < visibleCap || selectedExperiences.includes(exp));
  const hiddenCount = experiences.length - visibleExperiences.length;
  const vibeToggleLabel = vibeExpanded ? "Show less" : hiddenCount > 0 ? `+${hiddenCount} more` : null;

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      {/* Party size */}
      <section>
        <p className="mb-2.5 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-800">Who's going?</p>
        <div className="flex justify-center">
          <PillGroup
            options={BUDGET_BASIS_ORDER.map((b) => ({ key: b, label: `${BUDGET_BASIS_META[b].icon} ${BUDGET_BASIS_META[b].label}` }))}
            value={budgetBasis}
            onChange={(v) => setBudgetBasis(v as BudgetBasis)}
            accent="emerald"
          />
        </div>
      </section>

      {/* Vibe — shown whenever the selection offers experience tags */}
      {showVibe && (
        <section>
          <p className="mb-2.5 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-800">What are you into?</p>
          {/* Base safeguard: the pill area is height-bounded and scrolls, so it
              stays contained for any tag count — regardless of the cap. Short
              lists never trigger a scrollbar. `overscroll-contain` stops scroll
              chaining into the wizard on mobile; `px-1`/`-mx-1` keep focus rings
              from clipping at the edges. */}
          <div className="-mx-1 max-h-56 overflow-y-auto overscroll-contain px-1">
            <div className="flex flex-wrap justify-center gap-2">
              {visibleExperiences.map((exp) => {
                const active = selectedExperiences.includes(exp);
                return (
                  <button
                    key={exp}
                    onClick={() => onToggleExperience(exp)}
                    aria-pressed={active}
                    className={`focus-ring-emerald min-h-[38px] rounded-full border px-3.5 py-1.5 text-[13px] transition-[transform,box-shadow,border-color,color] ${
                      active
                        ? "border-emerald-700 bg-emerald-700 font-semibold text-white shadow-sm"
                        : "border-[#e7e1d2] bg-white font-medium text-[#3c463f] hover:border-emerald-500 hover:text-emerald-800"
                    }`}
                  >
                    {exp}
                  </button>
                );
              })}
            </div>
          </div>
          {/* Toggle sits outside the scroll area so it's always reachable. */}
          {vibeToggleLabel && (
            <div className="mt-2 flex justify-center">
              <button
                onClick={() => setVibeExpanded((v) => !v)}
                aria-expanded={vibeExpanded}
                className="focus-ring-emerald min-h-[32px] rounded-full border border-dashed border-[#cbbfa6] bg-transparent px-3.5 py-1.5 text-[12px] font-semibold text-[#6f6a5d] transition-colors hover:border-emerald-500 hover:text-emerald-800"
              >
                {vibeToggleLabel}
              </button>
            </div>
          )}
          {/* Fixed-height slot so toggling selection never changes the block height. */}
          <div className="mt-3 flex h-5 items-center justify-center">
            {selectedExperiences.length > 0 && (
              <button
                onClick={onClearExperiences}
                className="focus-ring-emerald rounded text-[11px] font-semibold text-[#a09a89] transition-colors hover:text-[#6f6a5d]"
              >
                Clear ({selectedExperiences.length})
              </button>
            )}
          </div>
        </section>
      )}

      {/* Live feedback so the step feels substantial, not empty. Multi-unit shows
          the summed route timeline; single shows the live plan. */}
      {isMulti
        ? <PlanRouteSummary selection={selection} source={source} />
        : plan && <PlanProgressSummary plan={plan} />}
    </div>
  );
}
