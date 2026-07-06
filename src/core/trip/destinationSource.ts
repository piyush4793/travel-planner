import type { Country } from "../types";

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
}
