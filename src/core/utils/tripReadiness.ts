import type { Country } from "../types";

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
 * Trip-level readiness for a multi-country route, kept honest at every N.
 *
 * The data model has no per-country `visaZone` yet, so this returns the atlas's
 * "unknown data" fallback tier: a generic visa caveat plus a real, derived
 * border-crossing count (stops − 1). It is written as a pure function over the
 * ordered countries so that, when `visaZone` data lands, richer tiers (single
 * zone dedupe / grouped zones) are a data swap here — not a rewrite of the rail.
 * Never fabricates precision: no invented visa categories, no fake leg counts.
 */
export function tripReadiness(countries: Country[]): ReadinessItem[] {
  const items: ReadinessItem[] = [];
  const hops = Math.max(0, countries.length - 1);

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
