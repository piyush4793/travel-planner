import type { Country } from "../types";
import type { CountryRule } from "../data/itineraryRules";

/**
 * A single destination unit resolved to everything the itinerary engine needs:
 * a fully-merged {@link Country} (seed overlaid with detail data) and its rule
 * chunk (null when the unit has no offline itinerary). Returned by
 * {@link DestinationSource.loadUnit} so multi-unit planners can compose one plan
 * per unit without importing scope-specific loaders.
 */
export interface LoadedUnit {
  country: Country;
  rule: CountryRule | null;
}

/**
 * The scope a trip is planned in. `international` composes a trip across world
 * countries; `domestic` will compose one across cities within a single country
 * (India first). Both flow through the same {@link DestinationSource}, so the
 * Plan wizard is scope-agnostic and switching scope is a data-source swap.
 */
export type TripScope = "international" | "domestic";

/** Recommended/max trip-day bounds for a single destination unit. */
export interface DayBounds {
  rec: number;
  max: number;
}

/**
 * Strategy over a scope's plannable destination units. A "unit" is the thing a
 * traveller picks and allocates days to — a country in the international scope,
 * a city in the domestic scope — represented uniformly as a {@link Country}
 * seed (name + coordinates + region + ranking metadata).
 *
 * Keeping every scope behind this one interface means the picker, combo
 * suggestions, day estimates and plan builder never import world-specific data
 * directly: adding a new scope is implementing this interface plus registering
 * it, with no wizard changes.
 */
export interface DestinationSource {
  readonly scope: TripScope;
  /** Singular unit noun for scope-aware copy, e.g. "country". */
  readonly unitNoun: string;
  /** Plural unit noun for scope-aware copy, e.g. "countries". */
  readonly unitNounPlural: string;
  /** All plannable units for this scope, ranked most-popular first. */
  popular(): Country[];
  /** Resolve a unit name to its seed, or null if not plannable in this scope. */
  resolveUnit(name: string): Country | null;
  /** "Pairs well with" units for the chosen set, most-popular first. */
  comboRecommendations(chosen: string[], exclude?: Set<string>): Country[];
  /** Recommended/max trip-day bounds for a unit (synchronous, manifest-backed). */
  dayBounds(name: string): DayBounds;
  /**
   * Union of experience tags offered by the given units, in first-seen order.
   * Async because it reads each unit's detail data (loaded on demand). The
   * international scope derives this from country rule data; a future domestic
   * scope derives the same shape from its state/city data.
   */
  experiencesFor(names: string[]): Promise<string[]>;
  /**
   * Resolve a unit name to its plan-ready {@link LoadedUnit} (merged country +
   * rule), or null if the unit isn't plannable in this scope. Async because it
   * reads the unit's detail data on demand. Used by multi-unit planners to build
   * one itinerary per unit before composing them into a single route.
   */
  loadUnit(name: string): Promise<LoadedUnit | null>;
}
