import { memo, type ReactNode } from "react";
import PlanPopover from "./PlanPopover";
import RouteOrderEditor from "./RouteOrderEditor";

/** One route stop the levers can reorder and re-anchor. */
export type LeverStop = {
  name: string;
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
  /** Inline controls rendered on the same row, right after "Route order"
   *  (e.g. the compact "Jump to city" dropdown) so the toolbar stays one line. */
  children?: ReactNode;
  /** When set, a right-aligned "Top" control scrolls this anchor into view. */
  topAnchorId?: string;
};

const TRIGGER =
  "focus-ring-emerald flex min-h-[34px] items-center gap-1.5 rounded-full border border-line-strong bg-white px-3 py-1 text-[11px] font-semibold text-ink-1 transition-colors hover:border-emerald-500 hover:bg-emerald-50";

/**
 * Trip-level "levers bar" for the multi-country Route Canvas — the one place the
 * whole-trip axes live, so each stop's header stays uncluttered (identity + adjust
 * + collapse only). Party size stays in the persistent header (single source) and
 * total trip length is a read-only header stat retuned per stop via each stop's
 * ✏️ Adjust drawer; here we expose **Route order** (drag/keyboard reorder · anchor
 * ★ · auto-arrange), an inline slot for a co-located control (the compact
 * "Jump to city" dropdown, so the toolbar stays one row), plus an optional
 * right-aligned **↑ Top** jump (the route label already lives in the shared
 * header, so the canvas drops the redundant summary band). The popover opens
 * through the shared {@link PlanPopover} (anchored desktop, bottom-sheet mobile).
 */
function RouteLeversBarInner({ stops, anchorName, onSetAnchor, onReorder, onAutoArrange, canAutoArrange, children, topAnchorId }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-surface-3 bg-surface-1 px-4 py-1.5">
      <PlanPopover
        title="Route order"
        icon="🧭"
        subtitle="Drag to reorder · ★ sets your anchor"
        triggerAriaLabel="Edit route order"
        triggerClassName={TRIGGER}
        triggerLabel={
          <>
            <span aria-hidden="true">🧭</span> Route order
            <span className="rounded-full bg-surface-3 px-1.5 text-[10px] font-bold text-ink-2">{stops.length}</span>
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

      {children}

      {topAnchorId && (
        <button
          type="button"
          onClick={() => document.getElementById(topAnchorId)?.scrollIntoView({ behavior: "smooth", block: "start" })}
          aria-label="Jump to the top of the itinerary"
          className="focus-ring-emerald ml-auto flex min-h-[34px] shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-emerald-800 transition-colors hover:bg-emerald-50"
        >
          <span aria-hidden="true">↑</span> Top
        </button>
      )}
    </div>
  );
}

const RouteLeversBar = memo(RouteLeversBarInner);
export default RouteLeversBar;
