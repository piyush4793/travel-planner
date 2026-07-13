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

/** Every scope with a registered destination source. Registry-driven. */
export const REGISTERED_SCOPES = Object.keys(SOURCES) as TripScope[];

/**
 * The scope whose source actually recognises `name`, guarding against a
 * persisted scope/destination desync (e.g. international countries left under a
 * domestic scope by a stale `tp_plan_scope` + a resume that repopulated the
 * selection). If the `preferred` scope resolves the destination it wins;
 * otherwise the first registered scope that resolves it does; failing that
 * (e.g. a custom destination absent from every manifest) `preferred` stands.
 */
export function scopeForDestination(name: string, preferred: TripScope): TripScope {
  if (!name || getDestinationSource(preferred).resolveUnit(name)) return preferred;
  for (const scope of REGISTERED_SCOPES) {
    if (scope !== preferred && getDestinationSource(scope).resolveUnit(name)) return scope;
  }
  return preferred;
}
