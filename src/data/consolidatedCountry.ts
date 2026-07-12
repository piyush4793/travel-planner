import {
  createConsolidatedLoader,
  type ConsolidatedCountry,
  type ConsolidatedLoader,
} from "./consolidatedLoader";

export type { ConsolidatedCountry } from "./consolidatedLoader";

const DIR = "../../data/rules/";
const ruleModules = import.meta.glob<ConsolidatedCountry>(
  ["../../data/rules/*.json", "!../../data/rules/index.json"],
  { import: "default" },
);

/**
 * International (world-country) consolidated store — the default rule source for
 * the {@link DestinationSource} seam and every single-country surface. Exposed as
 * a {@link ConsolidatedLoader} so scope-aware hooks (`useCountryRule`) can be
 * pointed at either this or the domestic store without importing scope-specific
 * functions.
 */
export const internationalRuleStore: ConsolidatedLoader = createConsolidatedLoader(ruleModules, DIR);

/** Load full consolidated country data on demand (delegates to the store). */
export function loadConsolidatedCountry(name: string): Promise<ConsolidatedCountry | null> {
  return internationalRuleStore.load(name);
}
