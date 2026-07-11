import type { Country } from "../../../core/types";
import type { DestinationSource } from "../../../core/trip/destinationSource";
import type { TripPlan } from "../../../core/utils/tripPlans";
import { BUDGET_BASIS_ORDER, BUDGET_BASIS_META, type BudgetBasis } from "../../../core/utils/budget";
import PillGroup from "../../shared/PillGroup";
import PlanProgressSummary from "./PlanProgressSummary";
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
   * Composed-route budget (per active party size) for the multi-unit route
   * card, which is the single home for trip totals on Basics. Ignored for a
   * single unit (its live `plan` already carries cost).
   */
  routeCost?: string;
  routeCostIcon?: string;
  routeCostLabel?: string;
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
  stopDays,
  routeCost,
  routeCostIcon,
  routeCostLabel,
  plan,
}: Props) {
  const isMulti = selection.length > 1;
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
            <p className="mb-2.5 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-800 lg:text-left">What are you into?</p>
            <ExperiencePicker
              experiences={experiences}
              selectedExperiences={selectedExperiences}
              onToggleExperience={onToggleExperience}
              onClearExperiences={onClearExperiences}
              visibleCap={visibleCap}
              align="start"
            />
          </section>
        )}
      </div>

      {/* Live feedback so the step feels substantial, not empty. Multi-unit shows
          the summed route timeline; single shows the live plan. On desktop this
          becomes the companion column beside the questions. */}
      <div>
        {isMulti
          ? <PlanRouteSummary selection={selection} source={source} stopDays={stopDays} cost={routeCost} costIcon={routeCostIcon} costLabel={routeCostLabel} />
          : plan && <PlanProgressSummary plan={plan} />}
      </div>
    </div>
  );
}
