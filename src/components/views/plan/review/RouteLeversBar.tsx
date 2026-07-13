import { memo, type ReactNode } from "react";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import PlanPopover from "../ui/PlanPopover";
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
  /** Scope-aware flag resolver (domestic stops read the home-country flag). */
  flagFor?: (name: string) => string;
  /** Inline controls rendered on the same row, right after "Route order"
   *  (e.g. the compact "Jump to city" dropdown) so the toolbar stays one line. */
  children?: ReactNode;
};

const TRIGGER =
  "focus-ring-emerald flex min-h-[34px] items-center gap-1.5 rounded-full border border-line-strong bg-surface-1 px-3 py-1 text-[11px] font-semibold text-ink-1 transition-colors hover:border-brand-500 hover:bg-brand-50";

/**
 * Trip-level "levers bar" for the multi-country Route Canvas — the one place the
 * whole-trip axes live, so each stop's header stays uncluttered (identity + adjust
 * + collapse only). Party size stays in the persistent header (single source) and
 * total trip length is a read-only header stat retuned per stop via each stop's
 * ✏️ Adjust drawer; here we expose **Route order** (drag/keyboard reorder · anchor
 * ★ · auto-arrange) plus an inline slot for a co-located control (the compact
 * "Jump to city" dropdown, so the toolbar stays one row). The bar renders pinned
 * above the itinerary scroll area on every breakpoint, so Jump is always reachable
 * (there is no separate "back to top" control — it would be redundant). The route
 * label lives in the shared header, so the canvas drops the redundant summary
 * band. The popover opens through the shared {@link PlanPopover} (anchored
 * desktop, bottom-sheet mobile).
 */
function RouteLeversBarInner({ stops, anchorName, onSetAnchor, onReorder, onAutoArrange, canAutoArrange, flagFor, children }: Props) {
  // "Route order" → "Route" on mobile so the levers stay a single row at 375px.
  const compact = useBreakpoint() === "mobile";
  // A single-stop route has nothing to reorder or anchor — mold the lever away so
  // N=1 Review never shows an inert "Route order 1" control.
  const showRouteOrder = stops.length >= 2;
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-surface-3 bg-surface-1 px-4 py-1.5">
      {showRouteOrder && (
        <PlanPopover
          title="Route order"
          icon="🧭"
          subtitle="Drag to reorder · ★ sets your anchor"
          triggerAriaLabel="Edit route order"
          triggerClassName={TRIGGER}
          triggerLabel={
            <>
              <span aria-hidden="true">🧭</span> {compact ? "Route" : "Route order"}
              <span className="rounded-full bg-brand-100 px-1.5 text-[10px] font-bold text-brand-700">{stops.length}</span>
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
              flagFor={flagFor}
            />
          )}
        </PlanPopover>
      )}

      {children}
    </div>
  );
}

const RouteLeversBar = memo(RouteLeversBarInner);
export default RouteLeversBar;
