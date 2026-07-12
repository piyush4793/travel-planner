import type { CountryRule } from "../core/data/itineraryRules";

/**
 * Consolidated destination data — the per-unit detail chunk shared by the
 * international world catalog (`data/rules/*.json`) and the domestic India
 * catalog (`data/domestic/india/rules/*.json`). Both scopes author the identical
 * shape (domestic files add a few optional practical fields the engine ignores),
 * so one loader factory serves both.
 */
export type ConsolidatedCountry = {
  name: string;
  seed: boolean;
  lat: number;
  lng: number;
  region: string;
  bestMonths: string[];
  worstMonths: string[];
  budget: { solo: string; couple: string; family4: string };
  experiences: string[];
  avoid: string[];
  combo: string[];
  landmark: string | null;
  stopoverNote: string | null;
  links: { label: string; url: string }[];
  cities: { name: string; lat: number; lng: number; bestMonths?: string[]; worstMonths?: string[]; notes?: string; experiences?: string[] }[];
  itinerary: CountryRule | null;
};

/** A lazy `import.meta.glob` map of consolidated JSON chunks, keyed by module path. */
export type RuleModuleMap = Record<string, () => Promise<ConsolidatedCountry>>;

/** Slugify a destination name into the file-stem convention used by every scope. */
export function slugify(name: string): string {
  return name
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The demand-loaded consolidated store for one scope's rule chunks. */
export interface ConsolidatedLoader {
  /** Module path for a unit name (matches the glob keys), for membership checks. */
  fileKey(name: string): string;
  /** Whether a unit has an offline rule chunk in this scope. */
  has(name: string): boolean;
  /** Load a unit's consolidated data on demand (cached, null when absent). */
  load(name: string): Promise<ConsolidatedCountry | null>;
  /** Synchronous peek at the cache: undefined = not yet loaded. */
  getCached(name: string): ConsolidatedCountry | null | undefined;
}

/**
 * Build the on-demand consolidated loader for one scope. `modules` is the scope's
 * `import.meta.glob` map (which must be created at each call site with a literal
 * pattern — Vite requires it) and `dirPrefix` is the shared path prefix so a unit
 * name maps to its module key. Each unit is fetched and cached at most once.
 */
export function createConsolidatedLoader(modules: RuleModuleMap, dirPrefix: string): ConsolidatedLoader {
  const cache = new Map<string, ConsolidatedCountry | null>();
  const fileKey = (name: string) => `${dirPrefix}${slugify(name)}.json`;

  return {
    fileKey,
    has: (name) => fileKey(name) in modules,
    getCached: (name) => cache.get(name),
    async load(name) {
      if (cache.has(name)) return cache.get(name)!;
      const loader = modules[fileKey(name)];
      if (!loader) {
        cache.set(name, null);
        return null;
      }
      try {
        const data = await loader();
        cache.set(name, data);
        return data;
      } catch {
        cache.set(name, null);
        return null;
      }
    },
  };
}
