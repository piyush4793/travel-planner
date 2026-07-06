import { memo } from "react";
import type { Country } from "../../../core/types";
import type { DestinationSource } from "../../../core/trip/destinationSource";
import { getCountryFlag } from "../../../utils/countryFlags";

type Props = {
  /** Ordered trip selection (visit order). */
  selection: Country[];
  /** Scope source — supplies recommended day bounds per unit. */
  source: DestinationSource;
};

/**
 * Lightweight route readout for a multi-country trip's Basics step. Shows the
 * ordered destinations (flag + name + recommended nights) and the summed day
 * estimate, so the traveller sees the shape of the whole trip before the full
 * per-country itineraries compose downstream. Purely manifest-backed (rec days),
 * so it renders instantly with no rule loading.
 */
function PlanRouteSummaryInner({ selection, source }: Props) {
  const legs = selection.map((c) => ({ name: c.name, rec: source.dayBounds(c.name).rec }));
  const total = legs.reduce((sum, leg) => sum + leg.rec, 0);
  return (
    <div className="rounded-2xl border border-[#e4dece] bg-white/70 p-4 shadow-[0_1px_3px_rgba(20,40,30,0.05)]">
      <div className="flex items-baseline gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6f6a5d]">Your route</p>
        <span className="ml-auto font-display text-lg font-semibold text-[#16241d]">~{total} days</span>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-1.5 gap-y-1.5">
        {legs.map((leg, i) => (
          <span key={leg.name} className="flex items-center gap-x-1.5">
            <span className="flex items-center gap-1 rounded-full bg-[#f4f1e8] px-2.5 py-1 text-[11px] font-semibold text-[#1e2a25]">
              <span aria-hidden="true">{getCountryFlag(leg.name)}</span>
              {leg.name}
              <span className="text-[10px] font-medium text-[#8a8474]">· {leg.rec}d</span>
            </span>
            {i < legs.length - 1 && <span aria-hidden="true" className="text-[10px] text-[#cfc9b8]">→</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

const PlanRouteSummary = memo(PlanRouteSummaryInner);
export default PlanRouteSummary;
