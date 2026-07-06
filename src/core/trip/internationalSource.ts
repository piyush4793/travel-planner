import {
  popularDestinations,
  resolvePlannable,
  comboRecommendations,
  dayBoundsFor,
} from "../data/popularDestinations";
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
};
