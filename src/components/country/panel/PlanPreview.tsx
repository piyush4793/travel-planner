import { memo } from "react";
import type { Country } from "../../../core/types";
import type { CountryRule } from "../../../core/data/itineraryRules";
import type { TripPlan } from "../../../core/utils/tripPlans";
import { extractPlanCities } from "../../../core/utils/tripPlans";
import { isEnabled } from "../../../core/featureFlags";
import { exportItineraryAsPdf } from "../../../utils/pdfExport";

type Props = {
  country: Country;
  plan: TripPlan;
  homeCountry: string;
  onCinematic: (plan: TripPlan) => void;
  onItinerary: (plan: TripPlan) => void;
  isAiPlan?: boolean;
  rule?: CountryRule | null;
};

function PlanPreviewInner({ country, plan, homeCountry, onCinematic, onItinerary, isAiPlan, rule }: Props) {
  const hasRuleData = !!rule;
  const planCities = extractPlanCities(plan.days);

  const knownCityNames = new Set((country.cities ?? []).map((c) => c.name));
  const matchedCities = planCities.filter((c) => knownCityNames.has(c));
  const canCinematic = hasRuleData && matchedCities.length >= 2;

  const canExportPdf = isEnabled("pdfExport");

  const buttonCount = 1 + 1 + (canExportPdf ? 1 : 0);
  const gridCols = buttonCount >= 3 ? "grid-cols-3" : buttonCount === 2 ? "grid-cols-2" : "grid-cols-1";

  return (
    <div className="itinerary-card overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-100">
      {/* Summary bar */}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2.5 text-white">
        <span className="text-xs font-bold">{isAiPlan ? "✨" : "📅"} {plan.duration}</span>
        <span className="text-xs font-bold">{plan.costPerPerson} / person</span>
      </div>

      {plan.warning && (
        <div className="px-3 py-2 bg-amber-50 border-b border-amber-100">
          <p className="text-[11px] text-amber-700 leading-snug">{plan.warning}</p>
        </div>
      )}

      {/* City route preview */}
      {planCities.length > 1 && (
        <div className="overflow-x-auto scrollbar-hide border-b border-gray-100 px-3 py-2">
          <div className="min-w-max flex items-center gap-1.5">
          {planCities.map((city, i) => (
            <span key={city} className="flex items-center gap-1">
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700">
                {city}
              </span>
              {i < planCities.length - 1 && <span className="text-gray-300 text-[10px]">→</span>}
            </span>
          ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className={`p-2.5 grid gap-2 ${gridCols}`}>
        <button
          onClick={() => canCinematic && onCinematic(plan)}
          disabled={!canCinematic}
          className={`flex flex-col items-center gap-1 rounded-xl py-3.5 transition-[transform,colors,box-shadow] active:scale-[0.97] focus-ring ${
            canCinematic
              ? "cursor-pointer border border-slate-200 bg-white text-slate-900 shadow-sm shadow-slate-100 hover:-translate-y-0.5 hover:shadow-md"
              : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
          }`}
          title={canCinematic ? "Watch animated journey" : "Cinematic not available for this country"}
        >
          <span className="text-2xl leading-none">🎬</span>
          <span className="text-[10px] font-black tracking-wide mt-0.5">Cinematic</span>
          <span className={`text-[9px] leading-none ${canCinematic ? "text-slate-400" : "text-gray-300"}`}>
            {canCinematic ? "animated journey" : "not available"}
          </span>
        </button>
        <button
          onClick={() => onItinerary(plan)}
          className="flex flex-col items-center gap-1 rounded-xl border border-blue-100 bg-blue-50 py-3.5 text-blue-700 shadow-sm shadow-blue-100/60 transition-[transform,colors,box-shadow] active:scale-[0.97] hover:-translate-y-0.5 hover:bg-blue-100 hover:shadow-md focus-ring"
        >
          <span className="text-2xl leading-none">📋</span>
          <span className="text-[10px] font-black tracking-wide mt-0.5">Itinerary</span>
          <span className="text-[9px] text-blue-400 leading-none">day-by-day plan</span>
        </button>
        {canExportPdf && (
          <button
            onClick={() => exportItineraryAsPdf(plan, country, homeCountry)}
            className="flex flex-col items-center gap-1 rounded-xl border border-rose-100 bg-rose-50 py-3.5 text-rose-700 shadow-sm shadow-rose-100/60 transition-[transform,colors,box-shadow] active:scale-[0.97] hover:-translate-y-0.5 hover:bg-rose-100 hover:shadow-md focus-ring"
          >
            <span className="text-2xl leading-none">📄</span>
            <span className="text-[10px] font-black tracking-wide mt-0.5">Export PDF</span>
            <span className="text-[9px] text-rose-400 leading-none">save & share</span>
          </button>
        )}
      </div>
    </div>
  );
}

const PlanPreview = memo(PlanPreviewInner);
export default PlanPreview;
