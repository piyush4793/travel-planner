import type { Country } from "../../../core/types";
import type { DestinationSource } from "../../../core/trip/destinationSource";
import { BUDGET_BASIS_ORDER, BUDGET_BASIS_META, type BudgetBasis } from "../../../core/utils/budget";
import PillGroup from "../../shared/PillGroup";
import PlanRouteSummary from "./PlanRouteSummary";
import ExperiencePicker, { DEFAULT_VIBE_CAP } from "./ExperiencePicker";

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
  /**
   * Live per-stop day counts keyed by unit name (the forming plan's tuned
   * lengths). Passed to the multi-unit route card so its per-stop days + total
   * mirror the header and update with vibe/experience changes. Stops missing
   * here fall back to their recommended baseline until their plan loads.
   */
  stopDays?: Record<string, number>;
  /**
   * Composed-route budget (per active party size) shown on the summary. For a
   * single unit this is the live plan's cost; for a route it's the composed
   * total. The summary is the single home for trip totals on Basics.
   */
  routeCost?: string;
  routeCostIcon?: string;
  routeCostLabel?: string;
};

/**
 * The Basics step surface. It molds entirely from the data it's handed rather
 * than hardcoding a country trip:
 *
 * - Party size — always (every scope + shape needs it).
 * - Vibe pills — whenever the selection offers experience tags. For a single
 *   unit these are its own tags; for a multi-unit route they are the union of
 *   what every chosen unit offers (resolved upstream).
 * - Summary — one molding route timeline (`PlanRouteSummary`): a single-unit
 *   trip is the N=1 case (one stop, no anchor), a route is N>1. Single and
 *   multi therefore share one summary UI.
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
  stopDays,
  routeCost,
  routeCostIcon,
  routeCostLabel,
}: Props) {
  const showVibe = experiences.length > 0;

  return (
    <div className="mx-auto w-full max-w-md space-y-6 lg:grid lg:max-w-none lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-8 lg:space-y-0">
      {/* Questions column */}
      <div className="space-y-6">
        {/* Party size */}
        <section>
          <p className="mb-2.5 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-800 lg:text-left">Who's going?</p>
          <div className="flex justify-center lg:justify-start">
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
            <div className="mb-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 lg:justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-800">What are you into?</p>
              {selectedExperiences.length > 0 && (
                <button
                  onClick={onClearExperiences}
                  className="focus-ring-emerald inline-flex min-h-[30px] items-center gap-1 rounded-full border border-emerald-300 bg-white px-3 py-1 text-[11px] font-semibold text-emerald-800 transition-colors hover:border-emerald-400 hover:bg-emerald-50"
                >
                  <span aria-hidden="true" className="text-[10px]">✕</span> Clear ({selectedExperiences.length})
                </button>
              )}
            </div>
            <ExperiencePicker
              experiences={experiences}
              selectedExperiences={selectedExperiences}
              onToggleExperience={onToggleExperience}
              onClearExperiences={onClearExperiences}
              visibleCap={visibleCap}
              align="start"
              hideClear
            />
          </section>
        )}
      </div>

      {/* Live feedback so the step feels substantial, not empty. One molding
          route timeline for both single (N=1, one stop) and multi (N>1). On
          desktop this becomes the companion column beside the questions. */}
      <div>
        <PlanRouteSummary selection={selection} source={source} stopDays={stopDays} cost={routeCost} costIcon={routeCostIcon} costLabel={routeCostLabel} />
      </div>
    </div>
  );
}
