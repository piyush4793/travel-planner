import {
  createConsolidatedLoader,
  type ConsolidatedCountry,
  type ConsolidatedLoader,
} from "./consolidatedLoader";

/**
 * Domestic India consolidated store — the per-state detail chunks under
 * `data/domestic/india/rules/*.json`. Structurally identical to the international
 * store (each "unit" is a state whose `cities` are the plannable stops), so it
 * reuses the shared {@link createConsolidatedLoader} and flows through the exact
 * same itinerary engine. The extra practical fields the domestic JSON carries
 * (pricesAsOf, per-day pace, per-activity priority) are a structural superset the
 * engine ignores; `diet` (veg/vegan) is enriched onto `Country` and surfaced in
 * the Plan Insights rail + PDF, so it needs no engine involvement.
 */
const DIR = "../../data/domestic/india/rules/";
const ruleModules = import.meta.glob<ConsolidatedCountry>(
  ["../../data/domestic/india/rules/*.json"],
  { import: "default" },
);

/**
 * Domestic India rule store — exposed as a {@link ConsolidatedLoader} so the
 * scope-aware `useCountryRule` can plan a domestic primary stop from the same
 * seam the international scope uses.
 */
export const domesticIndiaRuleStore: ConsolidatedLoader = createConsolidatedLoader(ruleModules, DIR);

/** Load a domestic India state's consolidated data on demand. */
export function loadDomesticIndiaUnit(name: string): Promise<ConsolidatedCountry | null> {
  return domesticIndiaRuleStore.load(name);
}
