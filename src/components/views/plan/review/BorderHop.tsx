import { memo, useState } from "react";
import { haversineKm, type GeoPoint } from "@/core/utils/routeOrder";
import { crossCountryLinks, qualifyPlace } from "@/core/utils/transitLinks";

type Props = {
  fromName: string;
  toName: string;
  /** Last city of the previous stop / first city of this stop — prefills the search links city-to-city. */
  fromCity?: string;
  toCity?: string;
  /** Coordinates of the two stops — used only for a factual great-circle distance. */
  fromPoint?: GeoPoint;
  toPoint?: GeoPoint;
};

/**
 * The honest transition between two countries on a composed route. Collapsed it is
 * a single "Travel to X" row (no invented transit time). International fares and
 * routings are too dynamic to bake in, so expanded it hands off to live search
 * tools (flights / all-modes / directions) prefilled with the real endpoints — the
 * last city of the previous stop → first city of this stop, qualified by country
 * (e.g. "Bergen, Norway" → "Copenhagen, Denmark") so the results are city-accurate —
 * plus a factual great-circle distance for context, never a fabricated time or price.
 * Hops cost no itinerary days. Purely presentational: it never mutates the plan.
 */
function BorderHopInner({ fromName, toName, fromCity, toCity, fromPoint, toPoint }: Props) {
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
  // Prefill searches with the actual city endpoints when known, qualified by country
  // so "Bergen, Norway" → "Copenhagen, Denmark" disambiguates for the search tools.
  const fromEndpoint = fromCity ? qualifyPlace(fromCity, fromName) : fromName;
  const toEndpoint = toCity ? qualifyPlace(toCity, toName) : toName;
  const links = crossCountryLinks(fromEndpoint, toEndpoint);
  const routeLabel =
    fromCity && toCity ? `${fromCity} → ${toCity}` : "Cross-country hop";

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
          <p className="text-[10px] text-ink-3">{routeLabel} · check live fares & times</p>
        </div>
        <span aria-hidden="true" className="shrink-0 text-[11px] font-semibold text-brand-700">
          {open ? "Hide ▴" : "Options ▾"}
        </span>
      </button>

      {open && (
        <div id={panelId} className="border-t border-dashed border-line px-3.5 py-2.5">
          <ul className="space-y-1.5">
            {links.map((l) => (
              <li key={l.label}>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring-emerald flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-[11px] transition-colors hover:border-brand-200 hover:bg-brand-50"
                >
                  <span aria-hidden="true">{l.icon}</span>
                  <span className="flex-1 font-semibold text-ink-1">{l.label}</span>
                  <span className="text-[10px] text-ink-3">{l.hint}</span>
                  <span aria-hidden="true" className="text-brand-700">↗</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] leading-snug text-ink-3">
            {km != null ? `~${km.toLocaleString()} km apart · ` : ""}international fares & routings
            change daily — open a search above for live options. Hops cost no itinerary days.
          </p>
        </div>
      )}
    </div>
  );
}

const BorderHop = memo(BorderHopInner);
export default BorderHop;
