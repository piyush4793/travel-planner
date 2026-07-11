import { memo } from "react";

/** Stable scroll-anchor id for the top of a guided itinerary body. */
export const ITINERARY_TOP_ID = "plan-itinerary-top";

type Props = {
  /** Route/destination label shown on the left (e.g. "Norway → Denmark" or "Japan"). */
  label: string;
  /**
   * Id of a scroll anchor at the top of the itinerary body. When set, a "Top"
   * control scrolls it into view so long itineraries can snap back to day one.
   */
  topAnchorId?: string;
};

function scrollToTop(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Slim emerald strip atop a guided itinerary. It carries the route/destination
 * label and an optional "back to top" jump — the authoritative trip stats
 * (days · cost · places) live in the shared PlanTripHeader, so this bar no
 * longer repeats them. Shared by the single-country preview and the
 * multi-country Route Canvas so both read identically.
 */
function ItinerarySummaryBarInner({ label, topAnchorId }: Props) {
  return (
    <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-emerald-700 to-emerald-900 px-4 py-2.5 text-white">
      <span className="flex min-w-0 items-center gap-2 text-sm font-bold">
        <span aria-hidden="true" className="shrink-0">🧭</span>
        <span className="min-w-0 truncate">{label}</span>
      </span>
      {topAnchorId && (
        <button
          type="button"
          onClick={() => scrollToTop(topAnchorId)}
          aria-label="Jump to the top of the itinerary"
          className="focus-ring flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-white/25"
        >
          <span aria-hidden="true">↑</span> Top
        </button>
      )}
    </div>
  );
}

const ItinerarySummaryBar = memo(ItinerarySummaryBarInner);
export default ItinerarySummaryBar;
