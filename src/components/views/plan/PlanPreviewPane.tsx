import { memo } from "react";
import type { Country } from "../../../core/types";
import type { CountryRule } from "../../../core/data/itineraryRules";
import type { TripPlan } from "../../../core/utils/tripPlans";
import { extractPlanCities } from "../../../core/utils/tripPlans";
import ItineraryView, { groupDays } from "../../country/itinerary/ItineraryView";
import PlanCityJumpNav from "./PlanCityJumpNav";
import ItinerarySummaryBar, { ITINERARY_TOP_ID } from "./ItinerarySummaryBar";
import ItineraryToolbar from "./ItineraryToolbar";

type Props = {
  country: Country;
  plan: TripPlan;
  rule: CountryRule | null;
  homeCountry: string;
  onPlanWithAi?: () => void;
  onCinematic?: () => void;
};

/**
 * Live itinerary preview for the guided planner. Reuses the shared ItineraryView
 * day renderer so the guided tab and the Country Panel stay in lock-step.
 */
function PlanPreviewPaneInner({ country, plan, rule, homeCountry, onPlanWithAi, onCinematic }: Props) {
  const groups = groupDays(plan.days, rule);

  // Cinematic needs a mappable route: rule data + at least two plan cities the
  // country actually knows (so the fly-through has real coordinates to visit).
  const knownCityNames = new Set((country.cities ?? []).map((c) => c.name));
  const matchedCities = extractPlanCities(plan.days).filter((c) => knownCityNames.has(c));
  const canCinematic = !!rule && matchedCities.length >= 2;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#e4dece] bg-white shadow-[0_1px_3px_rgba(20,40,30,0.05)]">
      <ItinerarySummaryBar label={country.name} topAnchorId={ITINERARY_TOP_ID} />

      {plan.warning && (
        <div className="border-b border-amber-100 bg-amber-50 px-4 py-2">
          <p className="flex gap-1.5 text-[11px] leading-snug text-amber-700">
            <span aria-hidden="true" className="shrink-0">⚠️</span>
            <span>{plan.warning}</span>
          </p>
        </div>
      )}

      <PlanCityJumpNav sections={[{ country: country.name, cities: groups }]} />

      {/* Day-by-day body */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <span id={ITINERARY_TOP_ID} aria-hidden="true" />
        <ItineraryView plan={plan} rule={rule} variant="luxury" />
      </div>

      <ItineraryToolbar
        country={country}
        plan={plan}
        homeCountry={homeCountry}
        canCinematic={canCinematic}
        onCinematic={onCinematic}
        onPlanWithAi={onPlanWithAi}
      />
    </div>
  );
}

const PlanPreviewPane = memo(PlanPreviewPaneInner);
export default PlanPreviewPane;
