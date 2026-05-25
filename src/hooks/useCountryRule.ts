import { useState, useEffect, useRef } from "react";
import type { CountryRule } from "../data/itineraryRules";

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
  cities: { name: string; lat: number; lng: number; bestMonths?: string[]; notes?: string }[];
  itinerary: CountryRule | null;
};

// Dynamic importers discovered at build time (exclude index.json only)
const ruleModules = import.meta.glob<ConsolidatedCountry>(
  ["../../data/rules/*.json", "!../../data/rules/index.json"],
  { import: "default" },
);

// In-memory cache
const cache = new Map<string, ConsolidatedCountry | null>();

function fileKey(name: string): string {
  return `../../data/rules/${name.toLowerCase().replace(/\s+/g, "-")}.json`;
}

/** Load full consolidated country data on demand */
export async function loadConsolidatedCountry(name: string): Promise<ConsolidatedCountry | null> {
  if (cache.has(name)) return cache.get(name)!;
  const loader = ruleModules[fileKey(name)];
  if (!loader) { cache.set(name, null); return null; }
  try {
    const data = await loader();
    cache.set(name, data);
    return data;
  } catch {
    cache.set(name, null);
    return null;
  }
}

/** Get just the itinerary rule (for tripPlans.ts compatibility) */
export function getCachedRule(name: string): CountryRule | null {
  return cache.get(name)?.itinerary ?? null;
}

/** Preload without blocking */
export function preloadCountry(name: string): void {
  if (!cache.has(name)) loadConsolidatedCountry(name);
}

export type UseCountryRuleResult = {
  data: ConsolidatedCountry | null;
  rule: CountryRule | null;
  loading: boolean;
};

/** React hook — loads consolidated country data, returns { data, rule, loading } */
export function useCountryRule(countryName: string | undefined): UseCountryRuleResult {
  const [data, setData] = useState<ConsolidatedCountry | null>(
    () => (countryName ? cache.get(countryName) ?? null : null),
  );
  const [loading, setLoading] = useState(false);
  const nameRef = useRef(countryName);

  useEffect(() => {
    nameRef.current = countryName;
    if (!countryName) { setData(null); setLoading(false); return; }

    const cached = cache.get(countryName);
    if (cached !== undefined) { setData(cached); setLoading(false); return; }

    if (!(fileKey(countryName) in ruleModules)) { setData(null); setLoading(false); return; }

    setLoading(true);
    loadConsolidatedCountry(countryName).then((r) => {
      if (nameRef.current === countryName) {
        setData(r);
        setLoading(false);
      }
    });
  }, [countryName]);

  return { data, rule: data?.itinerary ?? null, loading };
}
