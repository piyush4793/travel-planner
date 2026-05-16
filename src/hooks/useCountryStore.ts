import { useState, useEffect, useCallback, useMemo } from "react";
import seedData from "../../data/countries.json";
import catalogData from "../../data/worldCatalog.json";
import type { Country, CatalogEntry } from "../types";
import { loadLS, saveLS } from "../utils/storage";
import { usePersistedSet } from "./usePersistedSet";

const SEED = seedData as Country[];
const CATALOG = catalogData as CatalogEntry[];

function buildCountryList(customs: Country[], deleted: string[]): Country[] {
  const overrides = new Map(customs.map((c) => [c.name, c]));
  const base = SEED
    .filter((c) => !deleted.includes(c.name))
    .map((c) => overrides.get(c.name) ?? c);
  const added = customs.filter((c) => !SEED.find((s) => s.name === c.name));
  return [...base, ...added];
}

function initMyList(): Set<string> {
  const stored = loadLS<string[] | null>("tp_my_list", null);
  if (stored !== null) return new Set(stored);
  const customNames = loadLS<Country[]>("tp_customs", []).map((c) => c.name);
  const deletedNames = loadLS<string[]>("tp_deleted", []);
  const seedNames = SEED.map((c) => c.name).filter((n) => !deletedNames.includes(n));
  return new Set([...seedNames, ...customNames]);
}

export function useCountryStore() {
  const [customs, setCustoms] = useState<Country[]>(() => loadLS("tp_customs", []));
  const [deleted, setDeleted] = useState<string[]>(() => loadLS("tp_deleted", []));

  useEffect(() => { saveLS("tp_customs", customs); }, [customs]);
  useEffect(() => { saveLS("tp_deleted", deleted); }, [deleted]);

  const visited = usePersistedSet("tp_visited", () => new Set(loadLS<string[]>("tp_visited", [])));
  const favorites = usePersistedSet("tp_favorites", () => new Set(loadLS<string[]>("tp_favorites", [])));
  const myList = usePersistedSet("tp_my_list", initMyList);

  const allCountries = useMemo(() => buildCountryList(customs, deleted), [customs, deleted]);

  const myListCountries = useMemo(() => {
    const inList = allCountries.filter((c) => myList.set.has(c.name));
    return [...inList].sort((a, b) => {
      const aFav = favorites.set.has(a.name) ? 0 : 1;
      const bFav = favorites.set.has(b.name) ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;
      return a.name.localeCompare(b.name);
    });
  }, [allCountries, myList.set, favorites.set]);

  const myListNames = useMemo(() => myListCountries.map((c) => c.name), [myListCountries]);

  const saveCountry = useCallback((country: Country) => {
    setCustoms((prev) => [...prev.filter((c) => c.name !== country.name), country]);
    myList.add(country.name);
  }, [myList]);

  const deleteCountry = useCallback((country: Country) => {
    setCustoms((prev) => prev.filter((c) => c.name !== country.name));
    if (SEED.find((s) => s.name === country.name)) {
      setDeleted((prev) => [...prev, country.name]);
    }
  }, []);

  const updateNotes = useCallback((name: string, notes: string) => {
    setCustoms((prev) => {
      const existing = prev.find((c) => c.name === name) ?? allCountries.find((c) => c.name === name);
      if (!existing) return prev;
      const updated = { ...existing, notes: notes.trim() || undefined };
      return [...prev.filter((c) => c.name !== name), updated];
    });
  }, [allCountries]);

  const addToList = useCallback((name: string) => {
    myList.add(name);
    const inSeed = SEED.find((s) => s.name === name);
    if (inSeed) {
      setDeleted((prev) => prev.filter((n) => n !== name));
    } else {
      setCustoms((prev) => {
        if (prev.some((c) => c.name === name)) return prev;
        const cat = CATALOG.find((c) => c.name === name);
        if (!cat) return prev;
        const minimal: Country = {
          name: cat.name, lat: cat.lat, lng: cat.lng,
          bestMonths: [], budget: "", experiences: [],
        };
        return [...prev, minimal];
      });
    }
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
    catalog: CATALOG,
  } as const;
}
