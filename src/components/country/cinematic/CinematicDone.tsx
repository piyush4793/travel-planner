import { planCostBasisIcon } from "../../../core/utils/tripPlans";
import type { TripPlan } from "../../../core/utils/tripPlans";

type Props = {
  /** Whether the journey returns to an international departure origin. */
  showOrigin: boolean;
  homeCity: string;
  plan: TripPlan;
};

/**
 * The completion ("trip complete") phase of the cinematic overlay. Pure
 * presentational leaf extracted from ItineraryCinematic for unit-testability.
 */
export default function CinematicDone({ showOrigin, homeCity, plan }: Props) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 text-center pb-8">
      <span className="text-5xl mb-2">🎉</span>
      <h3 className="text-lg font-black">{showOrigin ? `Back in ${homeCity}!` : "Trip complete!"}</h3>
      <p className="text-xs text-stone-400">{plan.duration} · {plan.costPerPerson} {planCostBasisIcon(plan)}</p>
      <div className="mt-3 text-[11px] text-stone-400 leading-relaxed text-left bg-white/5 rounded-xl px-4 py-3">
        {plan.note}
      </div>
    </div>
  );
}
