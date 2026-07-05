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
