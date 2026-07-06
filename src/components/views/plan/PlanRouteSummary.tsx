import { memo } from "react";
import type { Country } from "../../../core/types";
import type { DestinationSource } from "../../../core/trip/destinationSource";
import { getCountryFlag } from "../../../utils/countryFlags";
import Tooltip from "../../shared/Tooltip";

type Props = {
  /** Ordered trip selection (visit order). */
  selection: Country[];
  /** Scope source — supplies recommended day bounds + unit nouns per unit. */
  source: DestinationSource;
};

/**
 * Vertical route timeline for a multi-unit trip's Basics step. Molds purely from
 * the passed data — the ordered selection plus the scope source — so it renders
 * countries today and domestic cities later with no changes. Manifest-backed
 * (rec days + region), so it paints instantly with no rule loading.
 *
 * The longest stay is marked as the trip's anchor to give the route a focal
 * point, and a footer reassures the traveller that each stop is fine-tuned next.
 */
function PlanRouteSummaryInner({ selection, source }: Props) {
  const legs = selection.map((c) => ({
    name: c.name,
    region: c.region,
    days: source.dayBounds(c.name).rec,
  }));
  const total = legs.reduce((sum, leg) => sum + leg.days, 0);
  const anchorDays = Math.max(...legs.map((l) => l.days));
  const unitCount = `${legs.length} ${legs.length === 1 ? source.unitNoun : source.unitNounPlural}`;

  return (
    <div className="rounded-2xl border border-[#e4dece] bg-white/70 p-4 shadow-[0_1px_3px_rgba(20,40,30,0.05)] sm:p-5">
      <div className="flex items-center gap-1.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6f6a5d]">Your route</p>
        <Tooltip text="Recommended starting lengths for each stop. You'll fine-tune the exact days per stop in the next steps." />
        <div className="ml-auto text-right leading-none">
          <span className="font-display text-xl font-semibold text-[#16241d]">~{total} days</span>
          <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-[0.14em] text-[#a29d8c]">recommended</span>
        </div>
      </div>

      <ol className="mt-3.5">
        {legs.map((leg, i) => {
          const isAnchor = leg.days === anchorDays;
          const last = i === legs.length - 1;
          return (
            <li key={leg.name} className="relative flex gap-3 pb-4 last:pb-0">
              {/* Timeline rail: dot + connector to the next stop. */}
              <div className="relative flex flex-col items-center">
                <span
                  className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-white ${isAnchor ? "bg-emerald-600" : "bg-[#cfc9b8]"}`}
                  aria-hidden="true"
                />
                {!last && <span className="mt-0.5 w-px flex-1 bg-[#e4dece]" aria-hidden="true" />}
              </div>

              <div className="-mt-0.5 flex min-w-0 flex-1 items-center gap-2">
                <span aria-hidden="true" className="text-lg leading-none">{getCountryFlag(leg.name)}</span>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-[15px] font-semibold text-[#16241d]">
                    {leg.name}
                    {isAnchor && legs.length > 1 && (
                      <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700">Anchor</span>
                    )}
                  </p>
                  <p className="truncate text-[11px] text-[#8a8474]">{leg.region}</p>
                </div>
                <span
                  title={`Recommended ${leg.days} days`}
                  className="ml-auto shrink-0 rounded-full bg-[#f4f1e8] px-2.5 py-1 text-[11px] font-semibold text-[#1e2a25]"
                >
                  {leg.days}d
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-1 border-t border-[#efeadd] pt-3 text-center text-[11px] text-[#8a8474]">
        {unitCount} · we'll fine-tune each stop next
      </p>
    </div>
  );
}

const PlanRouteSummary = memo(PlanRouteSummaryInner);
export default PlanRouteSummary;
