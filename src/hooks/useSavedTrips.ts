import { useCallback, useEffect, useState } from "react";
import { loadLS, saveLS } from "../core/storage";
import { LS_KEYS } from "../core/lsKeys";
import type { SavedTrip } from "../core/utils/savedTrips";

function newId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch {
    /* fall through to the timestamp id */
  }
  return `trip_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Store for trips the traveller saved from the Plan wizard. Each entry is a
 * self-contained snapshot ({@link SavedTrip}) persisted to {@link LS_KEYS.SAVED_TRIPS},
 * so a saved trip survives later My List / rule changes. Upsert is keyed by the
 * route signature (`name`) so re-saving the same ordered route updates it in
 * place (preserving its id, favourite and original save time) instead of
 * duplicating. The list stays newest-first.
 */
export function useSavedTrips() {
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>(() => loadLS(LS_KEYS.SAVED_TRIPS, []));

  useEffect(() => { saveLS(LS_KEYS.SAVED_TRIPS, savedTrips); }, [savedTrips]);

  const upsert = useCallback((snapshot: Omit<SavedTrip, "id" | "favorite">) => {
    setSavedTrips((prev) => {
      const idx = prev.findIndex((t) => t.name === snapshot.name);
      if (idx === -1) return [{ ...snapshot, id: newId() }, ...prev];
      const existing = prev[idx];
      const next = [...prev];
      // Preserve identity, favourite and original save time; refresh the content.
      next[idx] = { ...snapshot, id: existing.id, favorite: existing.favorite, savedAt: existing.savedAt };
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setSavedTrips((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setSavedTrips((prev) => prev.map((t) => (t.id === id ? { ...t, favorite: !t.favorite } : t)));
  }, []);

  // Favourite by route signature (name) — used by the Plan wizard, which knows
  // the composed route it just auto-saved but not its store id.
  const toggleFavoriteByName = useCallback((name: string) => {
    setSavedTrips((prev) => prev.map((t) => (t.name === name ? { ...t, favorite: !t.favorite } : t)));
  }, []);

  const reload = useCallback(() => setSavedTrips(loadLS(LS_KEYS.SAVED_TRIPS, [])), []);

  return { savedTrips, upsert, remove, toggleFavorite, toggleFavoriteByName, reload } as const;
}
