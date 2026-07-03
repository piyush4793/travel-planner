import type { Country } from "../../../core/types";
import type { TripPlan } from "../../../core/utils/tripPlans";
import { useItineraryShare } from "../../../hooks/useItineraryShare";

export { buildShareText } from "./shareText";

type Props = {
  country: Country;
  homeCountry: string;
  plan?: TripPlan | null;
};

export default function ShareButton({ country, homeCountry, plan }: Props) {
  const { share, prefetch, status } = useItineraryShare(country, homeCountry, plan);

  const label =
    status === "working" ? "Preparing…" : status === "copied" ? "Copied!" : "Share";
  const icon = status === "working" ? "⏳" : status === "copied" ? "✓" : "🔗";
  const ariaLabel =
    status === "copied" ? "Copied to clipboard" : "Share destination and itinerary";

  return (
    <button
      onClick={() => void share()}
      onPointerEnter={prefetch}
      onFocus={prefetch}
      disabled={status === "working"}
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 min-h-[32px] text-[11px] font-semibold transition-colors focus-ring ring-1 bg-white text-gray-500 ring-gray-200 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-60 disabled:cursor-wait"
      aria-label={ariaLabel}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
