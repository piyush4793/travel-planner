import { memo } from "react";
import type { Country } from "../../../core/types";
import type { CountryRule } from "../../../core/data/itineraryRules";
import type { TripPlan } from "../../../core/utils/tripPlans";
import { extractPlanCities, planCostBasisIcon, planCostBasisLabel } from "../../../core/utils/tripPlans";
import { isEnabled } from "../../../core/featureFlags";
import { exportItineraryAsPdf } from "../../../utils/pdfExport";
import { useItineraryShare } from "../../../hooks/useItineraryShare";
import ItineraryView, { groupDays } from "../../country/itinerary/ItineraryView";
import PlanCityJumpNav from "./PlanCityJumpNav";

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
  const { share, prefetch, status } = useItineraryShare(country, homeCountry, plan);
  const shareLabel = status === "working" ? "…" : status === "copied" ? "Copied!" : "Share";
  const shareIcon = status === "working" ? "⏳" : status === "copied" ? "✓" : "📤";

  // Cinematic needs a mappable route: rule data + at least two plan cities the
  // country actually knows (so the fly-through has real coordinates to visit).
  const knownCityNames = new Set((country.cities ?? []).map((c) => c.name));
  const matchedCities = extractPlanCities(plan.days).filter((c) => knownCityNames.has(c));
  const canCinematic = !!onCinematic && !!rule && matchedCities.length >= 2;
  const canExportPdf = isEnabled("pdfExport");

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

      <PlanCityJumpNav groups={groups} />

      {/* Day-by-day body */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <ItineraryView plan={plan} rule={rule} variant="luxury" />
      </div>

      {/* Actions — one slim, low-emphasis toolbar. Peers, not a wall of CTAs:
          icon + tiny label (matching the app's icon-control convention), evenly
          distributed, with Share lightly emphasised as the suggested action. */}
      <div className="flex items-stretch gap-0.5 border-t border-[#e6e1d4] p-1.5">
        <button
          onClick={() => void share()}
          onPointerEnter={prefetch}
          onFocus={prefetch}
          disabled={status === "working"}
          aria-label={status === "copied" ? "Plan copied to clipboard" : "Share your trip plan"}
          className="focus-ring-emerald flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-[10px] font-bold text-emerald-800 transition-colors hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-60"
        >
          <span aria-hidden="true" className="text-lg leading-none">{shareIcon}</span>
          {shareLabel}
        </button>
        {canCinematic && (
          <button
            onClick={onCinematic}
            aria-label="Watch the animated cinematic journey"
            className="focus-ring-emerald flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-[10px] font-semibold text-[#6f6a5d] transition-colors hover:bg-[#f4f1e8]"
          >
            <span aria-hidden="true" className="text-lg leading-none">🎬</span>
            Cinematic
          </button>
        )}
        {canExportPdf && (
          <button
            onClick={() => exportItineraryAsPdf(plan, country, homeCountry)}
            aria-label="Export this itinerary as a PDF"
            className="focus-ring-emerald flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-[10px] font-semibold text-[#6f6a5d] transition-colors hover:bg-[#f4f1e8]"
          >
            <span aria-hidden="true" className="text-lg leading-none">📄</span>
            PDF
          </button>
        )}
        {onPlanWithAi && (
          <button
            onClick={onPlanWithAi}
            aria-label="Plan this trip with your own AI provider"
            className="focus-ring-emerald flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-[10px] font-semibold text-[#6f6a5d] transition-colors hover:bg-[#f4f1e8]"
          >
            <span aria-hidden="true" className="text-lg leading-none">✨</span>
            AI plan
          </button>
        )}
      </div>
    </div>
  );
}

const PlanPreviewPane = memo(PlanPreviewPaneInner);
export default PlanPreviewPane;
