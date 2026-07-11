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
  /**
   * Live per-stop day counts keyed by unit name (the forming plan's tuned
   * lengths). When a stop is present here its day count + the route total track
   * the header's composed plan and react to vibe/experience changes. Stops not
   * yet loaded fall back to their recommended baseline so the route still paints
   * instantly from the manifest.
   */
  stopDays?: Record<string, number>;
};

/**
 * Vertical route timeline for a multi-unit trip's Basics step. Molds purely from
 * the passed data — the ordered selection plus the scope source — so it renders
 * countries today and domestic cities later with no changes. Manifest-backed
 * (rec days + region), so it paints instantly with no rule loading, then upgrades
 * each stop to its live planned length as {@link Props.stopDays} fills in.
 *
 * The longest stay is marked as the trip's anchor to give the route a focal
 * point, and a footer reassures the traveller that each stop is fine-tuned next.
 */
function PlanRouteSummaryInner({ selection, source, stopDays }: Props) {
  const legs = selection.map((c) => {
    const live = stopDays?.[c.name];
    return {
      name: c.name,
      region: c.region,
      days: live ?? source.dayBounds(c.name).rec,
      live: live !== undefined,
    };
  });
  const total = legs.reduce((sum, leg) => sum + leg.days, 0);
  const anchorDays = Math.max(...legs.map((l) => l.days));
  const unitCount = `${legs.length} ${legs.length === 1 ? source.unitNoun : source.unitNounPlural}`;

  return (
    <div className="rounded-2xl border border-line bg-white/70 p-4 shadow-[0_1px_3px_rgba(20,40,30,0.05)] sm:p-5">
      <div className="flex items-center gap-1.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-2">Your route</p>
        <Tooltip text="Your trip so far, summed across every stop. It updates as you change what you're into; fine-tune the exact days per stop in the next steps." />
        <div className="ml-auto text-right leading-none">
          <span className="font-display text-xl font-semibold text-ink-1">~{total} days</span>
          <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-[0.14em] text-ink-4">planned so far</span>
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
                  className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-white ${isAnchor ? "bg-emerald-600" : "bg-line-strong"}`}
                  aria-hidden="true"
                />
                {!last && <span className="mt-0.5 w-px flex-1 bg-line" aria-hidden="true" />}
              </div>

              <div className="-mt-0.5 flex min-w-0 flex-1 items-center gap-2">
                <span aria-hidden="true" className="text-lg leading-none">{getCountryFlag(leg.name)}</span>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-[15px] font-semibold text-ink-1">
                    {leg.name}
                    {isAnchor && legs.length > 1 && (
                      <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700">Anchor</span>
                    )}
                  </p>
                  <p className="truncate text-[11px] text-ink-3">{leg.region}</p>
                </div>
                <span
                  title={leg.live ? `${leg.days} days planned` : `Recommended ${leg.days} days`}
                  className="ml-auto shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-ink-1"
                >
                  {leg.days}d
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-1 border-t border-surface-3 pt-3 text-center text-[11px] text-ink-3">
        {unitCount} · we'll fine-tune each stop next
      </p>
    </div>
  );
}

const PlanRouteSummary = memo(PlanRouteSummaryInner);
export default PlanRouteSummary;
