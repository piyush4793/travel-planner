/**
 * Which home countries have a domestic (within-country) dataset — the single
 * source of truth for whether the Plan wizard offers the Domestic scope. Only
 * India ships a domestic dataset today; adding another is a data + registry
 * entry here (plus its {@link DestinationSource}), with no UI changes.
 *
 * Kept as a normalized set so callers pass the raw `homeCountry` label.
 */
const DOMESTIC_HOME_COUNTRIES = new Set(["india"]);

/** True when a domestic dataset exists for the traveller's home country. */
export function hasDomesticScope(homeCountry: string): boolean {
  return DOMESTIC_HOME_COUNTRIES.has(homeCountry.trim().toLowerCase());
}
