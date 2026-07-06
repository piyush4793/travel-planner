import {
  popularDestinations,
  resolvePlannable,
  comboRecommendations,
  dayBoundsFor,
} from "../data/popularDestinations";
import { loadConsolidatedCountry } from "../../data/consolidatedCountry";
import { consolidatedToCountry, mergeCountryData } from "../utils/countryData";
import type { DestinationSource } from "./destinationSource";

/**
 * International scope — a trip composed across world countries, backed by the
 * rule manifest (`data/rules/index.json`) and per-country rule chunks. This is
 * the default source and delegates to the existing world-catalog helpers.
 */
export const internationalSource: DestinationSource = {
  scope: "international",
  unitNoun: "country",
  unitNounPlural: "countries",
  popular: popularDestinations,
  resolveUnit: resolvePlannable,
  comboRecommendations,
  dayBounds: dayBoundsFor,
  async experiencesFor(names) {
    const loaded = await Promise.all(names.map((n) => loadConsolidatedCountry(n)));
    const seen = new Set<string>();
    const union: string[] = [];
    for (const country of loaded) {
      for (const exp of country?.experiences ?? []) {
        if (!seen.has(exp)) {
          seen.add(exp);
          union.push(exp);
        }
      }
    }
    return union;
  },
  async loadUnit(name) {
    const data = await loadConsolidatedCountry(name);
    const seed = resolvePlannable(name) ?? (data ? consolidatedToCountry(data) : null);
    if (!seed) return null;
    return { country: mergeCountryData(seed, data), rule: data?.itinerary ?? null };
  },
};
