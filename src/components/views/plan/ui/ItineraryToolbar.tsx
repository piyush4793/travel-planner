import { memo } from "react";
import type { Country } from "@/core/types";
import type { TripPlan } from "@/core/utils/tripPlans";
import type { PdfRouteStop } from "@/utils/pdfModel";
import { isEnabled } from "@/core/featureFlags";
import { exportItineraryAsPdf } from "@/utils/pdfExport";

type Props = {
  /** Destination the share/PDF name after (the primary stop for a composed trip). */
  country: Country;
  plan: TripPlan;
  homeCountry: string;
  /**
   * Per-stop breakdown for a multi-stop route, in visit order. When present with
   * more than one stop the PDF renders per-country sections; omit (or single) for
   * a single-destination PDF. Scope-agnostic — any future domestic route works.
   */
  routeStops?: PdfRouteStop[];
  /** Enable the cinematic control (caller owns the route-mappable guard). */
  canCinematic?: boolean;
  onCinematic?: () => void;
  onPlanWithAi?: () => void;
};

/**
 * The slim, low-emphasis secondary action toolbar under a guided itinerary:
 * Cinematic, PDF, and AI plan. (Share is promoted to the wizard header, left of
 * favourites, so it is never buried.) Icon + tiny label peers, evenly distributed.
 * Shared by the multi-country Route Canvas so the actions stay identical across
 * single + multi. Each optional control renders only when its capability/flag is
 * available, so the bar never shows dead CTAs; when none is available it renders
 * nothing.
 */
function ItineraryToolbarInner({ country, plan, homeCountry, routeStops, canCinematic, onCinematic, onPlanWithAi }: Props) {
  const showCinematic = !!canCinematic && !!onCinematic;
  const canExportPdf = isEnabled("pdfExport");
  if (!showCinematic && !canExportPdf && !onPlanWithAi) return null;

  return (
    <div className="flex items-stretch gap-0.5 p-1.5">
      {showCinematic && (
        <button
          onClick={onCinematic}
          aria-label="Watch the animated cinematic journey"
          className="focus-ring-emerald flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-[10px] font-semibold text-ink-2 transition-colors hover:bg-surface-2"
        >
          <span aria-hidden="true" className="text-lg leading-none">🎬</span>
          Cinematic
        </button>
      )}
      {canExportPdf && (
        <button
          onClick={() => exportItineraryAsPdf(plan, country, homeCountry, routeStops)}
          aria-label="Export this itinerary as a PDF"
          className="focus-ring-emerald flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-[10px] font-semibold text-ink-2 transition-colors hover:bg-surface-2"
        >
          <span aria-hidden="true" className="text-lg leading-none">📄</span>
          PDF
        </button>
      )}
      {onPlanWithAi && (
        <button
          onClick={onPlanWithAi}
          aria-label="Plan this trip with your own AI provider"
          className="focus-ring-emerald flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-[10px] font-semibold text-ink-2 transition-colors hover:bg-surface-2"
        >
          <span aria-hidden="true" className="text-lg leading-none">✨</span>
          AI plan
        </button>
      )}
    </div>
  );
}

const ItineraryToolbar = memo(ItineraryToolbarInner);
export default ItineraryToolbar;
