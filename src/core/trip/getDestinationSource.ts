import type { DestinationSource, TripScope } from "./destinationSource";
import { internationalSource } from "./internationalSource";
import { domesticIndiaSource } from "./domesticIndiaSource";

/**
 * Registry of the destination source per trip scope. International composes a
 * trip across world countries; Domestic composes one across states/UTs within
 * India. The Plan wizard picks the active source through
 * {@link getDestinationSource} with no other changes — adding a scope is one
 * registry entry.
 */
const SOURCES: Partial<Record<TripScope, DestinationSource>> = {
  international: internationalSource,
  domestic: domesticIndiaSource,
};

/** The destination source for a trip scope, falling back to International. */
export function getDestinationSource(scope: TripScope): DestinationSource {
  return SOURCES[scope] ?? internationalSource;
}
