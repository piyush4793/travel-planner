import { memo } from "react";
import type { Country } from "@/core/types";
import type { DestinationSource } from "@/core/trip/destinationSource";
import { getCountryFlag } from "@/utils/countryFlags";
import Tooltip from "@/components/shared/Tooltip";

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
  /**
   * Composed-plan budget for the whole route (per the active party size). The
   * card is the single home for trip totals on Basics — the header omits its
   * stats strip there — so days + budget both live here. Absent until the plan
   * has composed.
   */
  cost?: string;
  costIcon?: string;
  costLabel?: string;
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
function PlanRouteSummaryInner({ selection, source, stopDays, cost, costIcon, costLabel }: Props) {
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
  const multi = legs.length > 1;
  // Hard-bound the list height so the card can't grow unbounded. The cap fits
  // today's max stops (MAX_TRIP_UNITS) fully — so visible days always reconcile
  // with the route total — and scrolls only if that cap is ever raised.
  const scrolls = legs.length > 3;

  return (
    <div className="rounded-2xl border border-line bg-white/70 p-4 shadow-[0_1px_3px_rgba(20,40,30,0.05)] sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-2">Your trip</p>
          <Tooltip
            variant="wrap"
            text="Your trip so far, summed across every stop. It updates as you change what you're into; fine-tune the exact days per stop in the next steps."
            triggerClassName="focus-ring-emerald inline-flex h-4 w-4 items-center justify-center rounded-full bg-surface-3 text-[9px] font-bold text-ink-4"
          >
            <span aria-hidden="true">ⓘ</span>
          </Tooltip>
        </div>
        <div className="text-right leading-tight">
          <span className="font-display text-xl font-semibold text-ink-1">~{total} days</span>
          {cost ? (
            <span className="mt-0.5 block whitespace-nowrap text-[13px] font-bold text-emerald-800">
              ~{cost}{" "}
              <span title={costLabel} aria-label={costLabel}>{costIcon}</span>
            </span>
          ) : (
            <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-[0.14em] text-ink-4">planned so far</span>
          )}
        </div>
      </div>

      <ol className={`mt-3.5 ${scrolls ? "max-h-[12.5rem] overflow-y-auto overflow-x-hidden overscroll-contain pr-1" : ""}`}>
        {legs.map((leg, i) => {
          const isAnchor = leg.days === anchorDays;
          const last = i === legs.length - 1;
          return (
            <li key={leg.name} className="flex gap-3">
              {/* Timeline rail: dot aligned to the stop name, with a continuous
                  connector that grows through the row gap to the next dot. */}
              <div className="flex flex-col items-center">
                <span
                  className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${isAnchor ? "bg-emerald-600" : "bg-ink-4"}`}
                  aria-hidden="true"
                />
                {!last && <span className="mt-1 w-px grow bg-line-strong" aria-hidden="true" />}
              </div>

              <div className={`flex min-w-0 flex-1 items-start gap-2 ${last ? "" : "pb-4"}`}>
                <span aria-hidden="true" className="text-lg leading-tight">{getCountryFlag(leg.name)}</span>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-[15px] font-semibold leading-tight text-ink-1">
                    {leg.name}
                    {isAnchor && multi && (
                      <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700">Anchor</span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-ink-3">{leg.region}</p>
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
        We'll fine-tune each stop next
      </p>
    </div>
  );
}

const PlanRouteSummary = memo(PlanRouteSummaryInner);
export default PlanRouteSummary;
