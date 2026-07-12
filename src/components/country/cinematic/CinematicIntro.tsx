import { planCostBasisIcon } from "../../../core/utils/tripPlans";
import type { TripPlan } from "../../../core/utils/tripPlans";

type Props = {
  /** Whether an international departure origin frames the route. */
  showOrigin: boolean;
  homeCity: string;
  homeLabel: string;
  title: string;
  plan: TripPlan;
  comboCountries?: Array<{ name: string }>;
  statusMsg: string;
  /** False until the shared map instance is ready to animate. */
  mapAvailable: boolean;
};

/**
 * The intro ("preparing journey") phase of the cinematic overlay. Pure
 * presentational leaf extracted from ItineraryCinematic so the loading/summary
 * copy is unit-testable without the WebGL map shell.
 */
export default function CinematicIntro({ showOrigin, homeCity, homeLabel, title, plan, comboCountries, statusMsg, mapAvailable }: Props) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 text-center pb-8">
      <span className="text-6xl" style={{ animation: "pulse 2s ease-in-out infinite" }}>🌍</span>
      <div>
        {showOrigin && (
          <>
            <p className="text-base font-bold text-white">{homeCity}</p>
            <p className="text-[11px] text-gray-600 -mt-0.5">{homeLabel}</p>
            <p className="text-gray-500 text-sm mt-2">✈</p>
          </>
        )}
        <p className="text-base font-bold text-white mt-2">{title}</p>
      </div>
      <p className="text-[11px] text-gray-400">{plan.duration} · {plan.costPerPerson} {planCostBasisIcon(plan)}</p>
      {comboCountries && comboCountries.length > 0 && (
        <div className="mt-1">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1.5">Also pairs with</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {comboCountries.map((c) => (
              <span key={c.name} className="text-[10px] font-semibold text-purple-400 bg-purple-950/60 border border-purple-800/50 px-2 py-0.5 rounded-full">
                {c.name}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center gap-2 mt-1">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-blue-400"
              style={{
                animation: "pulse 1.2s ease-in-out infinite",
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
        <p className="text-xs text-gray-500">{statusMsg}</p>
      </div>
      {!mapAvailable && (
        <p className="text-xs text-amber-400 mt-2">⚠ Switch to Map view to start the cinematic journey</p>
      )}
    </div>
  );
}
