import manifestData from "../../../data/rules/index.json";
import type { Country } from "../types";

type ManifestEntry = {
  name: string;
  lat: number;
  lng: number;
  region: string;
  inSeed: boolean;
  hasItinerary: boolean;
  recDays: number | null;
  maxDays: number | null;
  popularityScore?: number;
  combo?: string[];
};

const MANIFEST = manifestData as ManifestEntry[];

/** Build a minimal, plannable Country seed from a manifest entry. */
function seedFromManifest(m: ManifestEntry): Country {
  return {
    name: m.name,
    lat: m.lat,
    lng: m.lng,
    region: m.region,
    popularityScore: m.popularityScore,
    combo: m.combo,
    bestMonths: [],
    budget: "",
    experiences: [],
  };
}

/** Sort by popularity (desc), then name — the shared "most popular first" order. */
export function byPopularity(a: Country, b: Country): number {
  const pa = a.popularityScore ?? 0;
  const pb = b.popularityScore ?? 0;
  if (pb !== pa) return pb - pa;
  return a.name.localeCompare(b.name);
}

// Computed once — the manifest is a static import.
const POPULAR_DESTINATIONS: Country[] = MANIFEST.filter((m) => m.hasItinerary)
  .map(seedFromManifest)
  .sort(byPopularity);

/**
 * All rule-backed (plannable) destinations as minimal Country seeds, most popular
 * first. Callers exclude the user's existing list to build the "explore" tier.
 */
export function popularDestinations(): Country[] {
  return POPULAR_DESTINATIONS;
}

// Fast name → seed lookup for combo resolution (manifest is static).
const BY_NAME = new Map(POPULAR_DESTINATIONS.map((c) => [c.name, c]));

// Recommended/max trip-day bounds per plannable destination (manifest-backed).
const DAY_BOUNDS = new Map(
  MANIFEST.filter((m) => m.hasItinerary).map((m) => {
    const rec = m.recDays ?? 7;
    return [m.name, { rec, max: Math.max(m.maxDays ?? rec, rec) }] as const;
  }),
);

/** Recommended/max trip-day bounds for a plannable destination, with safe defaults. */
export function dayBoundsFor(name: string): { rec: number; max: number } {
  return DAY_BOUNDS.get(name) ?? { rec: 7, max: 14 };
}

/** Resolve a plannable destination name to its manifest seed, or null. */
export function resolvePlannable(name: string): Country | null {
  return BY_NAME.get(name) ?? null;
}

/**
 * Plannable "pairs well with" destinations for a set of already-chosen countries,
 * most popular first. Unions the `combo` targets of every chosen country, drops
 * anything already chosen (or excluded), and resolves each to a plannable seed.
 * Pure + synchronous — combo is denormalized into the manifest.
 */
export function comboRecommendations(chosen: string[], exclude?: Set<string>): Country[] {
  const skip = new Set(chosen);
  const seen = new Set<string>();
  const out: Country[] = [];
  for (const name of chosen) {
    const source = BY_NAME.get(name);
    for (const target of source?.combo ?? []) {
      if (skip.has(target) || seen.has(target) || exclude?.has(target)) continue;
      const seed = BY_NAME.get(target);
      if (!seed) continue;
      seen.add(target);
      out.push(seed);
    }
  }
  return out.sort(byPopularity);
}
