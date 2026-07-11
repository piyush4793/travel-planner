import { memo } from "react";
import type { Country } from "../../../core/types";
import type { TripPlan } from "../../../core/utils/tripPlans";
import { isEnabled } from "../../../core/featureFlags";
import { exportItineraryAsPdf } from "../../../utils/pdfExport";
import { useItineraryShare } from "../../../hooks/useItineraryShare";

type Props = {
  /** Destination the share/PDF name after (the primary stop for a composed trip). */
  country: Country;
  plan: TripPlan;
  homeCountry: string;
  /** Enable the cinematic control (caller owns the route-mappable guard). */
  canCinematic?: boolean;
  onCinematic?: () => void;
  onPlanWithAi?: () => void;
};

/**
 * The slim, low-emphasis action toolbar under a guided itinerary: Share (lightly
 * emphasised), Cinematic, PDF, and AI plan. Icon + tiny label peers, evenly
 * distributed. Shared by the single-country preview and the multi-country Route
 * Canvas so the actions stay identical across both. Each optional control renders
 * only when its capability/flag is available, so the bar never shows dead CTAs.
 */
function ItineraryToolbarInner({ country, plan, homeCountry, canCinematic, onCinematic, onPlanWithAi }: Props) {
  const { share, prefetch, status } = useItineraryShare(country, homeCountry, plan);
  const shareLabel = status === "working" ? "…" : status === "copied" ? "Copied!" : "Share";
  const shareIcon = status === "working" ? "⏳" : status === "copied" ? "✓" : "📤";
  const showCinematic = !!canCinematic && !!onCinematic;
  const canExportPdf = isEnabled("pdfExport");

  return (
    <div className="flex items-stretch gap-0.5 border-t border-line p-1.5">
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
          onClick={() => exportItineraryAsPdf(plan, country, homeCountry)}
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
