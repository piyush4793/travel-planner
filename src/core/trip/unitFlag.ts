import { getCountryFlag } from "@/utils/countryFlags";
import type { TripScope } from "./destinationSource";

/**
 * Scope-aware flag for a trip unit. International units are sovereign countries
 * (own flag emoji). Domestic units are states/UTs *within the traveller's home
 * country*, which have no flag of their own — so they share the home country's
 * flag as the honest scope marker. The home country is passed in (never
 * hardcoded) so the domestic scope generalises beyond India to any future
 * home-country dataset.
 */
export function unitFlag(name: string, scope: TripScope, homeCountry?: string): string {
  return scope === "domestic" ? getCountryFlag(homeCountry ?? name) : getCountryFlag(name);
}
