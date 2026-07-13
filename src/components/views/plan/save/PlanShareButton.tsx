import type { Country } from "@/core/types";
import type { TripPlan } from "@/core/utils/tripPlans";
import type { PdfRouteStop } from "@/utils/pdfModel";
import { useItineraryShare } from "@/hooks/useItineraryShare";

type Props = {
  /** Destination the share names after (the primary stop for a composed route). */
  country: Country;
  homeCountry: string;
  /** The composed, order-aware plan to share (single or multi-stop). */
  plan: TripPlan;
  /** Per-stop breakdown so the shared PDF renders per-country sections. */
  routeStops?: PdfRouteStop[];
};

/**
 * The Plan header's Share chip — promoted out of the itinerary toolbar (where it
 * was buried in the mobile "More" sheet) to sit left of the ★ favourite in the
 * wizard header, so the primary "share your trip" action is always one tap away.
 * A thin view over {@link useItineraryShare}: native PDF file → native text →
 * clipboard, with the jsPDF chunk prefetched on pointer/focus so the async share
 * stays inside the user gesture. Icon-only on mobile (label hidden below `md`),
 * icon + label on desktop. Reads the same order-aware composed plan the workspace
 * renders, so the shared PDF always matches the on-screen route order.
 */
export default function PlanShareButton({ country, homeCountry, plan, routeStops }: Props) {
  const { share, prefetch, status } = useItineraryShare(country, homeCountry, plan, routeStops);
  const label = status === "working" ? "…" : status === "copied" ? "Copied!" : "Share";
  const icon = status === "working" ? "⏳" : status === "copied" ? "✓" : "📤";

  return (
    <button
      onClick={() => void share()}
      onPointerEnter={prefetch}
      onFocus={prefetch}
      disabled={status === "working"}
      aria-label={status === "copied" ? "Plan copied to clipboard" : "Share your trip plan"}
      className="focus-ring-emerald inline-flex min-h-[32px] items-center gap-1 rounded-full border border-brand-200 bg-surface-1 px-2.5 py-1 text-[11px] font-bold text-brand-800 transition-colors hover:bg-brand-50 disabled:cursor-wait disabled:opacity-60"
    >
      <span aria-hidden="true" className="text-sm leading-none">{icon}</span>
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}
