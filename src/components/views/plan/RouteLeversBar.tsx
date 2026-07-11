import { memo } from "react";
import { getCountryFlag } from "../../../utils/countryFlags";
import { pickNightTarget, canAdjustLength, type LengthStop } from "../../../core/utils/tripLength";
import PlanPopover from "./PlanPopover";
import RouteOrderEditor from "./RouteOrderEditor";

/** One route stop the levers can reorder, re-anchor, and retune the length of. */
export type LeverStop = {
  name: string;
  customDays: number;
  daysPinned: boolean;
  maxDays: number;
  setDays: (days: number) => void;
};

type Props = {
  /** Stops in current visit order. */
  stops: LeverStop[];
  anchorName: string;
  onSetAnchor: (name: string) => void;
  /** Move the stop from one visit-order index to another (drag / keyboard). */
  onReorder: (from: number, to: number) => void;
  onAutoArrange: () => void;
  canAutoArrange: boolean;
};

const TRIGGER =
  "focus-ring-emerald flex min-h-[34px] items-center gap-1.5 rounded-full border border-[#d8d2c2] bg-white px-3 py-1 text-[11px] font-semibold text-[#1e2a25] transition-colors hover:border-emerald-500 hover:bg-emerald-50";

/**
 * Trip-level "levers bar" for the multi-country Route Canvas — the one place the
 * whole-trip axes live, so each stop's header stays uncluttered (identity + adjust
 * + collapse only). Party size stays in the persistent header (single source);
 * here we expose **Route order** (drag/keyboard reorder · anchor ★ · auto-arrange)
 * and **Trip length** (total nights ± spread across unpinned stops). Both open
 * through the shared {@link PlanPopover} (anchored desktop, bottom-sheet mobile).
 */
function RouteLeversBarInner({ stops, anchorName, onSetAnchor, onReorder, onAutoArrange, canAutoArrange }: Props) {
  const totalNights = stops.reduce((sum, s) => sum + s.customDays, 0);
  const lengthStops: LengthStop[] = stops.map((s) => ({ days: s.customDays, maxDays: s.maxDays, pinned: s.daysPinned }));

  const adjust = (dir: 1 | -1) => {
    const idx = pickNightTarget(lengthStops, dir);
    if (idx === null) return;
    stops[idx].setDays(stops[idx].customDays + dir);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[#efeadd] bg-[#faf8f1] px-4 py-2">
      <span className="text-[10px] font-bold uppercase tracking-wide text-[#a8a293]">Trip levers</span>

      <PlanPopover
        title="Route order"
        triggerAriaLabel="Edit route order"
        triggerClassName={TRIGGER}
        triggerLabel={
          <>
            <span aria-hidden="true">🧭</span> Route order
            <span className="rounded-full bg-[#ece7d8] px-1.5 text-[10px] font-bold text-[#6f6a5d]">{stops.length}</span>
          </>
        }
      >
        {() => (
          <RouteOrderEditor
            stops={stops}
            anchorName={anchorName}
            onSetAnchor={onSetAnchor}
            onReorder={onReorder}
            onAutoArrange={onAutoArrange}
            canAutoArrange={canAutoArrange}
          />
        )}
      </PlanPopover>

      <PlanPopover
        title="Trip length"
        triggerAriaLabel="Adjust total trip length"
        triggerClassName={TRIGGER}
        triggerLabel={
          <>
            <span aria-hidden="true">📅</span> {totalNights}n
          </>
        }
      >
        {() => (
          <div className="min-w-[236px] p-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => adjust(-1)}
                disabled={!canAdjustLength(lengthStops, -1)}
                aria-label="Remove a night"
                className="focus-ring-emerald flex h-9 w-9 items-center justify-center rounded-full border border-[#d8d2c2] bg-white text-lg font-bold text-[#1e2a25] transition-colors hover:border-emerald-500 hover:bg-emerald-50 disabled:opacity-30 disabled:hover:border-[#d8d2c2] disabled:hover:bg-white"
              >
                <span aria-hidden="true">−</span>
              </button>
              <span className="text-center">
                <span className="block font-display text-xl font-semibold text-[#16241d]">{totalNights}</span>
                <span className="text-[10px] font-medium uppercase tracking-wide text-[#a8a293]">nights total</span>
              </span>
              <button
                type="button"
                onClick={() => adjust(1)}
                disabled={!canAdjustLength(lengthStops, 1)}
                aria-label="Add a night"
                className="focus-ring-emerald flex h-9 w-9 items-center justify-center rounded-full border border-[#d8d2c2] bg-white text-lg font-bold text-[#1e2a25] transition-colors hover:border-emerald-500 hover:bg-emerald-50 disabled:opacity-30 disabled:hover:border-[#d8d2c2] disabled:hover:bg-white"
              >
                <span aria-hidden="true">+</span>
              </button>
            </div>
            <p className="mt-2 text-[10px] leading-snug text-[#8a8577]">
              Spreads across unpinned stops. Pinned stops (✎) hold their length.
            </p>
            <ul className="mt-2 space-y-0.5">
              {stops.map((s) => (
                <li key={s.name} className="flex items-center justify-between gap-2 text-[11px] text-[#6f6a5d]">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span aria-hidden="true">{getCountryFlag(s.name)}</span>
                    <span className="truncate">{s.name}</span>
                    {s.daysPinned && <span aria-hidden="true" title="Pinned length">✎</span>}
                  </span>
                  <span className="shrink-0 font-semibold text-[#1e2a25]">{s.customDays}n</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </PlanPopover>
    </div>
  );
}

const RouteLeversBar = memo(RouteLeversBarInner);
export default RouteLeversBar;
