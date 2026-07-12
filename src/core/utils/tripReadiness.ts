import type { Country } from "../types";
import type { TripScope } from "../trip/destinationSource";

/** Visual tone for a readiness line — maps to an icon in the rail. */
export type ReadinessTone = "ok" | "info" | "warn";

export type ReadinessItem = {
  tone: ReadinessTone;
  text: string;
};

/** Icon per tone, kept beside the model so every surface renders it identically. */
export const READINESS_ICON: Record<ReadinessTone, string> = {
  ok: "✓",
  info: "ℹ",
  warn: "!",
};

/**
 * Trip-level readiness for a route, kept honest at every N and molded by scope.
 *
 * International routes carry a cross-border framing (visa caveat + a real,
 * derived border-crossing count). Domestic routes have no visas or border
 * control, so they surface a reassuring "no visa" line plus the same honest
 * inter-stop leg count framed as travel to book, not a border to clear.
 *
 * The data model has no per-country `visaZone` yet, so the international path
 * returns the atlas's "unknown data" fallback tier. It stays a pure function
 * over the ordered stops so that, when `visaZone` data lands, richer tiers are a
 * data swap here — not a rewrite of the rail. Never fabricates precision: no
 * invented visa categories, no fake leg counts.
 */
export function tripReadiness(countries: Country[], scope: TripScope = "international"): ReadinessItem[] {
  const items: ReadinessItem[] = [];
  const hops = Math.max(0, countries.length - 1);

  if (scope === "domestic") {
    items.push({ tone: "ok", text: "No visa or border checks — domestic trip" });
    if (hops > 0) {
      items.push({
        tone: "info",
        text: `${hops} ${hops === 1 ? "leg" : "legs"} between stops — book travel early`,
      });
    }
    return items;
  }

  // Visa: honest fallback until per-country visaZone data exists.
  items.push({ tone: "warn", text: "Check visa rules per country before booking" });

  if (hops > 0) {
    items.push({
      tone: "info",
      text: `${hops} border ${hops === 1 ? "crossing" : "crossings"} — book inter-country legs early`,
    });
  }

  return items;
}
