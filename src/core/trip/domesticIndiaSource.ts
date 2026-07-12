import { domesticIndiaManifestSource } from "../data/domesticIndiaManifest";
import { domesticIndiaRuleStore, loadDomesticIndiaUnit } from "../../data/domesticIndia";
import { consolidatedToCountry, mergeCountryData } from "../utils/countryData";
import type { DestinationSource } from "./destinationSource";

/**
 * Domestic India scope — a trip composed across states/UTs *within* India, backed
 * by the domestic rule manifest (`data/domestic/india/index.json`) and per-state
 * rule chunks. A "unit" here is a STATE (its cities are the plannable stops),
 * mirroring how the international scope treats a country. Because every wizard
 * surface consumes this {@link DestinationSource} interface — never world data
 * directly — planning within India reuses the entire engine, Route Canvas, PDF,
 * cinematic and budget stack unchanged; only the data source differs.
 *
 * Offered only when the traveller's home country is India (gated at the call
 * site); other home countries have no domestic dataset yet.
 */
export const domesticIndiaSource: DestinationSource = {
  scope: "domestic",
  unitNoun: "state",
  unitNounPlural: "states",
  ruleStore: domesticIndiaRuleStore,
  popular: domesticIndiaManifestSource.popular,
  resolveUnit: domesticIndiaManifestSource.resolvePlannable,
  comboRecommendations: domesticIndiaManifestSource.comboRecommendations,
  dayBounds: domesticIndiaManifestSource.dayBoundsFor,
  async experiencesFor(names) {
    const loaded = await Promise.all(names.map((n) => loadDomesticIndiaUnit(n)));
    const seen = new Set<string>();
    const union: string[] = [];
    for (const unit of loaded) {
      for (const exp of unit?.experiences ?? []) {
        if (!seen.has(exp)) {
          seen.add(exp);
          union.push(exp);
        }
      }
    }
    return union;
  },
  async loadUnit(name) {
    const data = await loadDomesticIndiaUnit(name);
    const seed = domesticIndiaManifestSource.resolvePlannable(name) ?? (data ? consolidatedToCountry(data) : null);
    if (!seed) return null;
    return { country: mergeCountryData(seed, data), rule: data?.itinerary ?? null };
  },
};
