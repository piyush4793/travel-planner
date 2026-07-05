import { memo } from "react";
import type { Country } from "../../../core/types";
import type { CountryRule } from "../../../core/data/itineraryRules";
import type { TripPlan } from "../../../core/utils/tripPlans";
import { extractPlanCities, planCostBasisIcon, planCostBasisLabel } from "../../../core/utils/tripPlans";
import ItineraryView from "../../country/itinerary/ItineraryView";

type Props = {
  country: Country;
  plan: TripPlan;
  rule: CountryRule | null;
  onOpenDetails: () => void;
  onPlanWithAi?: () => void;
};

/**
 * Live itinerary preview for the guided planner. Reuses the shared ItineraryView
 * day renderer so the guided tab and the Country Panel stay in lock-step.
 */
function PlanPreviewPaneInner({ country, plan, rule, onOpenDetails, onPlanWithAi }: Props) {
  const planCities = extractPlanCities(plan.days);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#e4dece] bg-white shadow-[0_1px_3px_rgba(20,40,30,0.05)]">
      {/* Summary bar */}
      <div className="flex items-center justify-between bg-gradient-to-r from-emerald-700 to-emerald-900 px-4 py-3 text-white">
        <span className="text-sm font-bold">📅 {plan.duration}</span>
        <span className="text-sm font-bold">
          {plan.costPerPerson}{" "}
          <span title={planCostBasisLabel(plan)} aria-label={planCostBasisLabel(plan)}>{planCostBasisIcon(plan)}</span>
        </span>
      </div>

      {plan.warning && (
        <div className="border-b border-amber-100 bg-amber-50 px-4 py-2">
          <p className="text-[11px] leading-snug text-amber-700">{plan.warning}</p>
        </div>
      )}

      {planCities.length > 1 && (
        <div className="scrollbar-hide overflow-x-auto border-b border-[#e6e1d4] px-4 py-2">
          <div className="flex min-w-max items-center gap-1.5">
            {planCities.map((city, i) => (
              <span key={city} className="flex items-center gap-1">
                <span className="rounded-full bg-[#f4f1e8] px-2 py-1 text-[10px] font-semibold text-[#1e2a25]">{city}</span>
                {i < planCities.length - 1 && <span className="text-[10px] text-[#cfc9b8]">→</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Day-by-day body */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <ItineraryView plan={plan} rule={rule} variant="luxury" />
      </div>

      {/* Actions */}
      <div className="grid gap-2 border-t border-[#e6e1d4] p-3 sm:grid-cols-2">
        <button
          onClick={onOpenDetails}
          className="focus-ring-emerald flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#e4dece] bg-white px-3 py-2.5 text-xs font-bold text-[#1e2a25] shadow-sm transition-colors hover:bg-[#f4f1e8]"
        >
          🔎 Full details for {country.name}
        </button>
        {onPlanWithAi && (
          <button
            onClick={onPlanWithAi}
            className="focus-ring-emerald flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-800 shadow-sm transition-colors hover:bg-emerald-100"
          >
            ✨ Plan with your own AI
          </button>
        )}
      </div>
    </div>
  );
}

const PlanPreviewPane = memo(PlanPreviewPaneInner);
export default PlanPreviewPane;
