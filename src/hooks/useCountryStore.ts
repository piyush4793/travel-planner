import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import manifestData from "../../data/rules/index.json";
import catalogData from "../../data/worldCatalog.json";
import type { Country, CatalogEntry } from "../core/types";
import { loadLS, saveLS } from "../core/storage";
import { LS_KEYS } from "../core/lsKeys";
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

function buildCountryList(customs: Country[], enriched: Map<string, Country>): Country[] {
  const overrides = new Map(customs.map((c) => [c.name, c]));
  const seedEntries = MANIFEST.filter((m) => m.inSeed);
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

/**
 * "My List" is now an implicit **recents** ledger — an MRU of the destinations a
 * traveller has actually started planning, most-recent first. It is written
 * automatically (never hand-curated), deduped, and capped. Reuses the legacy
 * MY_LIST key; any previously-stored set migrates in as the initial order.
 */
const MAX_RECENTS = 24;

function loadRecents(): string[] {
  const stored = loadLS<unknown>(LS_KEYS.MY_LIST, null);
  if (!Array.isArray(stored)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of stored) {
    if (typeof n === "string" && n && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out.slice(0, MAX_RECENTS);
}

export function useCountryStore() {
  const [customs, setCustoms] = useState<Country[]>(() => loadLS(LS_KEYS.CUSTOMS, []));
  const [enriched, setEnriched] = useState<Map<string, Country>>(() => new Map());
  const [recents, setRecents] = useState<string[]>(loadRecents);

  useEffect(() => { saveLS(LS_KEYS.CUSTOMS, customs); }, [customs]);
  useEffect(() => { saveLS(LS_KEYS.MY_LIST, recents); }, [recents]);

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

  const allCountries = useMemo(() => buildCountryList(customs, enriched), [customs, enriched]);

  const recentsSet = useMemo(() => new Set(recents), [recents]);

  const myListCountries = useMemo(() => {
    const byName = new Map(allCountries.map((c) => [c.name, c]));
    // Resolve each recents name to the richest available Country, preserving
    // most-recent-first order. A name is never dropped just because it lacks a
    // seed/custom backing entry (falls back to enriched, then a catalog stub).
    const out: Country[] = [];
    for (const name of recents) {
      const resolved = byName.get(name) ?? enriched.get(name) ?? buildCatalogCountry(name);
      if (resolved) out.push(resolved);
    }
    return out;
  }, [allCountries, enriched, recents]);

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

  const updateNotes = useCallback((name: string, notes: string) => {
    setCustoms((prev) => {
      const existing = allCountries.find((c) => c.name === name) ?? prev.find((c) => c.name === name);
      if (!existing) return prev;
      const updated = { ...existing, notes: notes.trim() || undefined };
      return [...prev.filter((c) => c.name !== name), updated];
    });
  }, [allCountries]);

  // Record that the traveller started planning these destinations — prepends them
  // (most-recent first), dedupes, and caps the ledger. This is the sole writer of
  // "My List", which is now an implicit recents history, not a hand-curated set.
  const recordPlanned = useCallback((names: string[]) => {
    const clean = names.map((n) => n.trim()).filter(Boolean);
    if (clean.length === 0) return;
    setRecents((prev) => {
      const seen = new Set(clean);
      const next = [...clean];
      for (const n of prev) {
        if (!seen.has(n)) { seen.add(n); next.push(n); }
      }
      return next.slice(0, MAX_RECENTS);
    });
  }, []);

  // Soft refresh: re-read persisted country data from localStorage without a
  // full page reload (drives pull-to-refresh and post-import re-hydration).
  const reload = useCallback(() => {
    setCustoms(loadLS(LS_KEYS.CUSTOMS, []));
    setRecents(loadRecents());
  }, []);

  return {
    allCountries,
    myListCountries,
    myListNames,
    recents,
    recentsSet,
    recordPlanned,
    updateNotes,
    reload,
    catalog: CATALOG,
  } as const;
}
