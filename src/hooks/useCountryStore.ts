import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import manifestData from "../../data/rules/index.json";
import catalogData from "../../data/worldCatalog.json";
import type { Country, CatalogEntry } from "../core/types";
import { loadLS, saveLS } from "../core/storage";
import { LS_KEYS } from "../core/lsKeys";
import { usePersistedSet } from "./usePersistedSet";
import { loadConsolidatedCountry } from "../data/consolidatedCountry";
import { consolidatedToCountry } from "../core/utils/countryData";

type ManifestEntry = {
  name: string;
  lat: number;
  lng: number;
  region: string;
  inSeed: boolean;
  hasItinerary: boolean;
  recDays: number | null;
  maxDays: number | null;
  popularityScore?: number;
};

const MANIFEST = manifestData as ManifestEntry[];
const CATALOG = catalogData as CatalogEntry[];
const MANIFEST_BY_NAME = new Map(MANIFEST.map((m) => [m.name, m]));
const CATALOG_BY_NAME = new Map(CATALOG.map((c) => [c.name, c]));

// Seed country names from manifest
const SEED_NAMES = new Set(MANIFEST.filter((m) => m.inSeed).map((m) => m.name));

// Build minimal Country objects from manifest for seed countries (sync, instant)
function buildSeedCountry(m: ManifestEntry): Country {
  return {
    name: m.name, lat: m.lat, lng: m.lng, region: m.region,
    popularityScore: m.popularityScore,
    bestMonths: [], budget: "", experiences: [],
  };
}

// Build a minimal Country from catalog/manifest for a My List name that has no
// seed or custom backing entry (e.g. legacy data added before add-to-list began
// creating custom stubs). Guarantees My List names never silently vanish.
function buildCatalogCountry(name: string): Country | null {
  const src = CATALOG_BY_NAME.get(name) ?? MANIFEST_BY_NAME.get(name);
  if (!src) return null;
  return {
    name: src.name, lat: src.lat, lng: src.lng, region: src.region,
    popularityScore: MANIFEST_BY_NAME.get(name)?.popularityScore,
    bestMonths: [], budget: "", experiences: [],
  };
}

// Cache for enriched country data loaded from per-country JSON (capped to prevent unbounded growth)
const enrichedCache = new Map<string, Country>();
const MAX_ENRICHED_CACHE = 200;

async function enrichCountry(name: string): Promise<Country | null> {
  if (enrichedCache.has(name)) return enrichedCache.get(name)!;
  const data = await loadConsolidatedCountry(name);
  if (!data) return null;
  const country = consolidatedToCountry(data, MANIFEST_BY_NAME.get(data.name)?.popularityScore);
  if (enrichedCache.size >= MAX_ENRICHED_CACHE) {
    const firstKey = enrichedCache.keys().next().value;
    if (firstKey) enrichedCache.delete(firstKey);
  }
  enrichedCache.set(name, country);
  return country;
}

// A bare stub is a My List entry created purely from catalog data (no itinerary
// content and no user edits). Such entries can be transparently upgraded to their
// enriched rule-backed version without discarding anything the user authored.
function isBareStub(c: Country): boolean {
  return (!c.experiences || c.experiences.length === 0)
    && !c.budget
    && (!c.bestMonths || c.bestMonths.length === 0)
    && !c.notes
    && (!c.cities || c.cities.length === 0);
}

function buildCountryList(customs: Country[], deleted: string[], enriched: Map<string, Country>): Country[] {
  const overrides = new Map(customs.map((c) => [c.name, c]));
  const seedEntries = MANIFEST.filter((m) => m.inSeed && !deleted.includes(m.name));
  const base = seedEntries.map((m) => {
    if (overrides.has(m.name)) return overrides.get(m.name)!;
    if (enriched.has(m.name)) return enriched.get(m.name)!;
    return buildSeedCountry(m);
  });
  const added = customs
    .filter((c) => !SEED_NAMES.has(c.name))
    .map((c) => (isBareStub(c) ? enriched.get(c.name) ?? c : c));
  return [...base, ...added];
}

function initMyList(): Set<string> {
  const stored = loadLS<string[] | null>(LS_KEYS.MY_LIST, null);
  if (stored !== null) return new Set(stored);
  const customNames = loadLS<Country[]>(LS_KEYS.CUSTOMS, []).map((c) => c.name);
  const deletedNames = loadLS<string[]>(LS_KEYS.DELETED, []);
  const seedNames = [...SEED_NAMES].filter((n) => !deletedNames.includes(n));
  return new Set([...seedNames, ...customNames]);
}

export function useCountryStore() {
  const [customs, setCustoms] = useState<Country[]>(() => loadLS(LS_KEYS.CUSTOMS, []));
  const [deleted, setDeleted] = useState<string[]>(() => loadLS(LS_KEYS.DELETED, []));
  const [enriched, setEnriched] = useState<Map<string, Country>>(() => new Map());

  useEffect(() => { saveLS(LS_KEYS.CUSTOMS, customs); }, [customs]);
  useEffect(() => { saveLS(LS_KEYS.DELETED, deleted); }, [deleted]);

  // Enrich seed countries in idle-time chunks to avoid blocking first render
  const enrichTimerRef = useRef<number>(0);
  const enrichIdleRef = useRef<number>(0);
  useEffect(() => {
    const names = [...SEED_NAMES];
    let cancelled = false;
    const CHUNK_SIZE = 10;
    let idx = 0;

    function processChunk() {
      if (cancelled || idx >= names.length) return;
      const batch = names.slice(idx, idx + CHUNK_SIZE);
      idx += CHUNK_SIZE;
      Promise.all(batch.map(enrichCountry)).then((results) => {
        if (cancelled) return;
        setEnriched((prev) => {
          const next = new Map(prev);
          for (const c of results) { if (c) next.set(c.name, c); }
          return next;
        });
        if (idx < names.length) {
          if (typeof requestIdleCallback === "function") {
            enrichIdleRef.current = requestIdleCallback(() => processChunk());
          } else {
            enrichTimerRef.current = window.setTimeout(processChunk, 50);
          }
        }
      });
    }

    if (typeof requestIdleCallback === "function") {
      enrichIdleRef.current = requestIdleCallback(() => processChunk());
    } else {
      enrichTimerRef.current = window.setTimeout(processChunk, 50);
    }
    return () => {
      cancelled = true;
      if (enrichTimerRef.current) clearTimeout(enrichTimerRef.current);
      if (enrichIdleRef.current && typeof cancelIdleCallback === "function") cancelIdleCallback(enrichIdleRef.current);
    };
  }, []);

  const visited = usePersistedSet(LS_KEYS.VISITED, () => new Set(loadLS<string[]>(LS_KEYS.VISITED, [])));
  const favorites = usePersistedSet(LS_KEYS.FAVORITES, () => new Set(loadLS<string[]>(LS_KEYS.FAVORITES, [])));
  const myList = usePersistedSet(LS_KEYS.MY_LIST, initMyList);

  const allCountries = useMemo(() => buildCountryList(customs, deleted, enriched), [customs, deleted, enriched]);

  const myListCountries = useMemo(() => {
    const byName = new Map(allCountries.map((c) => [c.name, c]));
    const tombstoned = new Set(deleted);
    // Resolve every My List name — prefer the fully-built entry, then any enriched
    // rule data, then a catalog/manifest stub — so a name is never dropped just
    // because it lacks a seed/custom backing entry. Deleted seeds stay tombstoned.
    const inList: Country[] = [];
    for (const name of myList.set) {
      if (tombstoned.has(name) && !byName.has(name)) continue;
      const resolved = byName.get(name) ?? enriched.get(name) ?? buildCatalogCountry(name);
      if (resolved) inList.push(resolved);
    }
    return inList.sort((a, b) => {
      const aFav = favorites.set.has(a.name) ? 0 : 1;
      const bFav = favorites.set.has(b.name) ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;
      return a.name.localeCompare(b.name);
    });
  }, [allCountries, enriched, deleted, myList.set, favorites.set]);

  const myListNames = useMemo(() => myListCountries.map((c) => c.name), [myListCountries]);

  // Enrich non-seed My List countries (e.g. India) so they show real budget,
  // months and experiences. Seed enrichment only covers SEED_NAMES, but My List
  // is the source of truth per user, so anything the user tracks must hydrate.
  useEffect(() => {
    const pending = myListNames.filter(
      (n) => !SEED_NAMES.has(n) && MANIFEST_BY_NAME.has(n) && !enriched.has(n),
    );
    if (pending.length === 0) return;
    let cancelled = false;
    Promise.all(pending.map(enrichCountry)).then((results) => {
      if (cancelled) return;
      const resolved = results.filter((c): c is Country => c !== null);
      if (resolved.length === 0) return;
      setEnriched((prev) => {
        const next = new Map(prev);
        for (const c of resolved) next.set(c.name, c);
        return next;
      });
    });
    return () => { cancelled = true; };
  }, [myListNames, enriched]);

  const saveCountry = useCallback((country: Country) => {
    setCustoms((prev) => [...prev.filter((c) => c.name !== country.name), country]);
    myList.add(country.name);
  }, [myList]);

  const deleteCountry = useCallback((country: Country) => {
    setCustoms((prev) => prev.filter((c) => c.name !== country.name));
    if (SEED_NAMES.has(country.name)) {
      setDeleted((prev) => [...prev, country.name]);
    }
  }, []);

  const updateNotes = useCallback((name: string, notes: string) => {
    setCustoms((prev) => {
      const existing = allCountries.find((c) => c.name === name) ?? prev.find((c) => c.name === name);
      if (!existing) return prev;
      const updated = { ...existing, notes: notes.trim() || undefined };
      return [...prev.filter((c) => c.name !== name), updated];
    });
  }, [allCountries]);

  const addToList = useCallback((name: string) => {
    myList.add(name);
    if (SEED_NAMES.has(name)) {
      setDeleted((prev) => prev.filter((n) => n !== name));
    } else {
      setCustoms((prev) => {
        if (prev.some((c) => c.name === name)) return prev;
        const src = CATALOG.find((c) => c.name === name) ?? MANIFEST_BY_NAME.get(name);
        if (!src) return prev;
        const minimal: Country = {
          name: src.name, lat: src.lat, lng: src.lng,
          bestMonths: [], budget: "", experiences: [],
        };
        return [...prev, minimal];
      });
    }
  }, [myList]);

  // One-click bulk add (e.g. the creator's wishlist). Batches every state
  // update so N destinations cost a single re-render, not N.
  const addManyToList = useCallback((names: string[]) => {
    if (names.length === 0) return;
    myList.setSet((prev) => {
      const next = new Set(prev);
      for (const n of names) next.add(n);
      return next;
    });
    const seedNames = names.filter((n) => SEED_NAMES.has(n));
    if (seedNames.length) {
      const revive = new Set(seedNames);
      setDeleted((prev) => prev.filter((n) => !revive.has(n)));
    }
    const nonSeed = names.filter((n) => !SEED_NAMES.has(n));
    if (nonSeed.length) {
      setCustoms((prev) => {
        const existing = new Set(prev.map((c) => c.name));
        const additions: Country[] = [];
        for (const n of nonSeed) {
          if (existing.has(n)) continue;
          const src = CATALOG.find((c) => c.name === n) ?? MANIFEST_BY_NAME.get(n);
          if (!src) continue;
          existing.add(n);
          additions.push({ name: src.name, lat: src.lat, lng: src.lng, bestMonths: [], budget: "", experiences: [] });
        }
        return additions.length ? [...prev, ...additions] : prev;
      });
    }
  }, [myList]);

  // Restore My List to the default starter set (the auto-seeded countries).
  // Non-destructive to authored data: custom country edits stay in CUSTOMS and
  // reappear if re-added, but the visible list resets to defaults.
  const resetToDefaultList = useCallback(() => {
    myList.setSet(() => new Set(SEED_NAMES));
    setDeleted([]);
  }, [myList]);

  return {
    allCountries,
    myListCountries,
    myListNames,
    visited,
    favorites,
    myList,
    saveCountry,
    deleteCountry,
    updateNotes,
    addToList,
    addManyToList,
    resetToDefaultList,
    catalog: CATALOG,
  } as const;
}
