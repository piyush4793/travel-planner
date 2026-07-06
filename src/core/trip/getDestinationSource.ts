import type { DestinationSource, TripScope } from "./destinationSource";
import { internationalSource } from "./internationalSource";

/**
 * Registry of the destination source per trip scope. Only International exists
 * today; the future Domestic (India cities) source is registered here as a
 * single entry, and the Plan wizard picks it up through {@link getDestinationSource}
 * with no other changes.
 */
const SOURCES: Partial<Record<TripScope, DestinationSource>> = {
  international: internationalSource,
};

/** The destination source for a trip scope, falling back to International. */
export function getDestinationSource(scope: TripScope): DestinationSource {
  return SOURCES[scope] ?? internationalSource;
}
