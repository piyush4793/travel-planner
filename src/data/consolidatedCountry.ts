import type { CountryRule } from "../core/data/itineraryRules";

/** Consolidated country data from data/rules/*.json */
export type ConsolidatedCountry = {
  name: string;
  seed: boolean;
  lat: number;
  lng: number;
  region: string;
  bestMonths: string[];
  worstMonths: string[];
  budget: { solo: string; couple: string; family4: string };
  experiences: string[];
  avoid: string[];
  combo: string[];
  landmark: string | null;
  travelStyle: string[];
  stopoverNote: string | null;
  links: { label: string; url: string }[];
  cities: { name: string; lat: number; lng: number; bestMonths?: string[]; notes?: string; experiences?: string[] }[];
  itinerary: CountryRule | null;
};

const ruleModules = import.meta.glob<ConsolidatedCountry>(
  ["../../data/rules/*.json", "!../../data/rules/index.json"],
  { import: "default" },
);

const cache = new Map<string, ConsolidatedCountry | null>();

export function fileKey(name: string): string {
  const slug = name
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `../../data/rules/${slug}.json`;
}

export function hasConsolidatedCountry(name: string): boolean {
  return fileKey(name) in ruleModules;
}

/** Load full consolidated country data on demand */
export async function loadConsolidatedCountry(name: string): Promise<ConsolidatedCountry | null> {
  if (cache.has(name)) return cache.get(name)!;
  const loader = ruleModules[fileKey(name)];
  if (!loader) {
    cache.set(name, null);
    return null;
  }
  try {
    const data = await loader();
    cache.set(name, data);
    return data;
  } catch {
    cache.set(name, null);
    return null;
  }
}

export function getCachedConsolidatedCountry(name: string): ConsolidatedCountry | null | undefined {
  return cache.get(name);
}
