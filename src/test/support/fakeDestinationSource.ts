import type { DestinationSource } from "@/core/trip/destinationSource.ts";
import type { ConsolidatedLoader } from "@/data/consolidatedLoader.ts";

/** An inert {@link ConsolidatedLoader} — no chunks, nothing cached. */
export const emptyRuleStore: ConsolidatedLoader = {
  fileKey: (name) => `${name}.json`,
  has: () => false,
  load: async () => null,
  getCached: () => undefined,
};

/**
 * Build a fake {@link DestinationSource} for tests, with harmless defaults for
 * every method. Pass `overrides` to exercise just the behaviour under test — the
 * one seam a test cares about (e.g. `loadUnit`, `experiencesFor`, `dayBounds`).
 * Centralised so a new interface member (like `ruleStore`) is added once, not in
 * every test that stubs a source.
 */
export function fakeDestinationSource(overrides: Partial<DestinationSource> = {}): DestinationSource {
  return {
    scope: "international",
    unitNoun: "country",
    unitNounPlural: "countries",
    ruleStore: emptyRuleStore,
    popular: () => [],
    resolveUnit: () => null,
    comboRecommendations: () => [],
    dayBounds: () => ({ rec: 7, max: 14 }),
    experiencesFor: async () => [],
    loadUnit: async () => null,
    ...overrides,
  };
}
