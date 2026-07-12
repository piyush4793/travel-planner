import manifestData from "../../../data/rules/index.json";
import { createManifestSource, byPopularity, type ManifestEntry } from "./manifestSource";

const MANIFEST = manifestData as ManifestEntry[];
const source = createManifestSource(MANIFEST);

export { byPopularity };

/**
 * All rule-backed (plannable) destinations as minimal Country seeds, most popular
 * first. Callers exclude the user's existing list to build the "explore" tier.
 */
export const popularDestinations = source.popular;

/** Recommended/max trip-day bounds for a plannable destination, with safe defaults. */
export const dayBoundsFor = source.dayBoundsFor;

/** Resolve a plannable destination name to its manifest seed, or null. */
export const resolvePlannable = source.resolvePlannable;

/**
 * Plannable "pairs well with" destinations for a set of already-chosen countries,
 * most popular first. Unions the \`combo\` targets of every chosen country, drops
 * anything already chosen (or excluded), and resolves each to a plannable seed.
 * Pure + synchronous — combo is denormalized into the manifest.
 */
export const comboRecommendations = source.comboRecommendations;
