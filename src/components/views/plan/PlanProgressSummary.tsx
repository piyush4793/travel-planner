import { memo } from "react";
import type { TripPlan } from "../../../core/utils/tripPlans";
import { extractPlanCities, planCostBasisIcon, planCostBasisLabel } from "../../../core/utils/tripPlans";

type Props = { plan: TripPlan };

/**
 * Compact "your trip so far" readout for the guided planner's question steps.
 * Gives each answer immediate, tangible feedback — days, places and cost update
 * live as the user shapes the trip — so the steps feel substantial rather than
 * empty, without the density of the full review pane.
 */
function PlanProgressSummaryInner({ plan }: Props) {
  const cities = extractPlanCities(plan.days);
  return (
    <div className="rounded-2xl border border-line bg-white/70 p-4 shadow-[0_1px_3px_rgba(20,40,30,0.05)]">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-2">Your trip so far</p>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="font-display text-lg font-semibold text-ink-1">{plan.days.length} days</span>
        <span aria-hidden="true" className="text-line-strong">·</span>
        <span className="text-sm font-medium text-ink-1">
          {cities.length} {cities.length === 1 ? "place" : "places"}
        </span>
        <span className="ml-auto text-sm font-bold text-emerald-800">
          {plan.costPerPerson}{" "}
          <span title={planCostBasisLabel(plan)} aria-label={planCostBasisLabel(plan)}>{planCostBasisIcon(plan)}</span>
        </span>
      </div>
      {cities.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-1.5 gap-y-1.5">
          {cities.map((city, i) => (
            <span key={city} className="flex items-center gap-x-1.5">
              <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[10px] font-semibold text-ink-1">{city}</span>
              {i < cities.length - 1 && <span aria-hidden="true" className="text-[10px] text-line-strong">→</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const PlanProgressSummary = memo(PlanProgressSummaryInner);
export default PlanProgressSummary;
