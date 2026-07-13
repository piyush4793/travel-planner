import { memo, useState } from "react";
import { haversineKm, type GeoPoint } from "@/core/utils/routeOrder";

type Props = {
  fromName: string;
  toName: string;
  /** Coordinates of the two stops — used only for an honest distance/flight estimate. */
  fromPoint?: GeoPoint;
  toPoint?: GeoPoint;
};

const FLIGHT_KMPH = 800; // cruise ground speed
const FLIGHT_OVERHEAD_H = 1; // taxi/climb/descent buffer

/** Rounds an indicative flight time to a friendly ~Nh figure (never fake precision). */
function flightHours(km: number): number {
  return Math.max(1, Math.round(km / FLIGHT_KMPH + FLIGHT_OVERHEAD_H));
}

/**
 * The honest transition between two countries on a composed route. Collapsed it is
 * a single "Travel to X" row (no invented transit time); expanded it becomes an
 * informational **mode picker** — a distance-derived flight estimate (great-circle,
 * clearly indicative) plus rail/road as "varies", since we have no per-pair transit
 * data and must never fake it. Hops cost no itinerary days. Purely presentational:
 * it never mutates the plan.
 */
function BorderHopInner({ fromName, toName, fromPoint, toPoint }: Props) {
  const [open, setOpen] = useState(false);
  const hasGeo =
    !!fromPoint &&
    !!toPoint &&
    Number.isFinite(fromPoint.lat) &&
    Number.isFinite(fromPoint.lng) &&
    Number.isFinite(toPoint.lat) &&
    Number.isFinite(toPoint.lng);
  const km = hasGeo ? Math.round(haversineKm(fromPoint!, toPoint!)) : null;
  const panelId = `hop-${fromName.replace(/\s+/g, "-")}-${toName.replace(/\s+/g, "-")}`;

  return (
    <div className="mx-3 my-3 rounded-xl border border-dashed border-line-strong bg-surface-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="focus-ring-emerald flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left transition-colors hover:bg-surface-2"
      >
        <span aria-hidden="true" className="text-lg leading-none">✈️</span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-ink-1">
            Travel from {fromName} to {toName}
          </p>
          <p className="text-[10px] text-ink-3">
            Cross-country hop · plan flights/rail separately
          </p>
        </div>
        <span aria-hidden="true" className="shrink-0 text-[11px] font-semibold text-brand-700">
          {open ? "Hide ▴" : "Options ▾"}
        </span>
      </button>

      {open && (
        <div id={panelId} className="border-t border-dashed border-line px-3.5 py-2.5">
          <ul className="space-y-1.5 text-[11px] text-ink-body">
            <li className="flex items-center gap-2">
              <span aria-hidden="true">✈</span>
              <span className="flex-1">Flight</span>
              <span className="font-semibold text-ink-1">
                {km != null ? `~${flightHours(km)}h` : "check operators"}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden="true">🚆</span>
              <span className="flex-1">Rail</span>
              <span className="text-ink-3">varies</span>
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden="true">🚌</span>
              <span className="flex-1">Road</span>
              <span className="text-ink-3">varies</span>
            </li>
          </ul>
          <p className="mt-2 text-[10px] leading-snug text-ink-3">
            {km != null ? `~${km.toLocaleString()} km apart · ` : ""}times are indicative — confirm
            with an operator. Hops cost no itinerary days.
          </p>
        </div>
      )}
    </div>
  );
}

const BorderHop = memo(BorderHopInner);
export default BorderHop;
