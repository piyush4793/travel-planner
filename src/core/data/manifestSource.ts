import type { Country } from "../types";

/**
 * A rule-manifest row — the denormalized index shared by the international world
 * catalog (`data/rules/index.json`) and the domestic India catalog
 * (`data/domestic/india/index.json`). Both scopes use the identical shape, so
 * the plannable-unit helpers below are built once and instantiated per scope.
 */
export type ManifestEntry = {
  name: string;
  lat: number;
  lng: number;
  region: string;
  inSeed: boolean;
  hasItinerary: boolean;
  recDays: number | null;
  maxDays: number | null;
  popularityScore?: number;
  bestMonths?: string[];
  worstMonths?: string[];
  combo?: string[];
};

/** Recommended/max trip-day bounds for a plannable unit. */
export type DayBounds = { rec: number; max: number };

/** The pure, manifest-backed helpers a {@link DestinationSource} needs. */
export interface ManifestSource {
  /** All rule-backed units as minimal Country seeds, most popular first. */
  popular(): Country[];
  /** Resolve a unit name to its manifest seed, or null. */
  resolvePlannable(name: string): Country | null;
  /** Recommended/max trip-day bounds for a unit, with safe defaults. */
  dayBoundsFor(name: string): DayBounds;
  /** "Pairs well with" units for a chosen set, most popular first. */
  comboRecommendations(chosen: string[], exclude?: Set<string>): Country[];
}

/** Build a minimal, plannable Country seed from a manifest entry. */
function seedFromManifest(m: ManifestEntry): Country {
  return {
    name: m.name,
    lat: m.lat,
    lng: m.lng,
    region: m.region,
    popularityScore: m.popularityScore,
    combo: m.combo,
    bestMonths: m.bestMonths ?? [],
    worstMonths: m.worstMonths,
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

/**
 * Build the plannable-unit helpers for one scope's rule manifest. Everything is
 * computed once from the static manifest (the returned `popular()` array is a
 * stable reference), so a scope's source can hold these directly.
 *
 * Keeping this a factory means adding a new scope (e.g. domestic India) is just
 * passing its manifest here — no duplicated ranking/combo/day-bound logic.
 */
export function createManifestSource(manifest: ManifestEntry[]): ManifestSource {
  const plannable = manifest.filter((m) => m.hasItinerary);
  const popularList = plannable.map(seedFromManifest).sort(byPopularity);
  const byName = new Map(popularList.map((c) => [c.name, c]));
  const dayBounds = new Map(
    plannable.map((m) => {
      const rec = m.recDays ?? 7;
      return [m.name, { rec, max: Math.max(m.maxDays ?? rec, rec) }] as const;
    }),
  );

  return {
    popular: () => popularList,
    resolvePlannable: (name) => byName.get(name) ?? null,
    dayBoundsFor: (name) => dayBounds.get(name) ?? { rec: 7, max: 14 },
    comboRecommendations: (chosen, exclude) => {
      const skip = new Set(chosen);
      const seen = new Set<string>();
      const out: Country[] = [];
      for (const name of chosen) {
        const src = byName.get(name);
        for (const target of src?.combo ?? []) {
          if (skip.has(target) || seen.has(target) || exclude?.has(target)) continue;
          const seed = byName.get(target);
          if (!seed) continue;
          seen.add(target);
          out.push(seed);
        }
      }
      return out.sort(byPopularity);
    },
  };
}
