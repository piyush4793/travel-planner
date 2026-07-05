import { useState, useEffect, useCallback, useMemo } from "react";
import { loadLS, saveLS } from "../core/storage";
import { LS_KEYS } from "../core/lsKeys";
import { buildMergedTripGroups, type TripGroupDef } from "../core/data/tripGroups";
import type { Country } from "../core/types";

export function useTripStore(myListNames: string[], countries: Country[]) {
  const [tripCustoms, setTripCustoms] = useState<TripGroupDef[]>(() => loadLS(LS_KEYS.TRIP_CUSTOMS, []));
  const [tripDeleted, setTripDeleted] = useState<string[]>(() => loadLS(LS_KEYS.TRIP_DELETED, []));

  useEffect(() => { saveLS(LS_KEYS.TRIP_CUSTOMS, tripCustoms); }, [tripCustoms]);
  useEffect(() => { saveLS(LS_KEYS.TRIP_DELETED, tripDeleted); }, [tripDeleted]);

  const comboMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const c of countries) {
      if (c.combo?.length) map.set(c.name, c.combo);
    }
    return map;
  }, [countries]);

  const mergedTripGroups = useMemo(
    () => buildMergedTripGroups(tripCustoms, tripDeleted, myListNames, comboMap),
    [tripCustoms, tripDeleted, myListNames, comboMap],
  );

  const isSeedTrip = useCallback((main: string) => {
    return comboMap.has(main) || countries.some((c) => c.name === main);
  }, [comboMap, countries]);

  const saveTrip = useCallback((originalMain: string | null, group: TripGroupDef) => {
    if (originalMain && originalMain !== group.main) {
      if (isSeedTrip(originalMain)) {
        setTripDeleted((prev) => [...prev.filter((m) => m !== originalMain), originalMain]);
      }
      setTripCustoms((prev) => [...prev.filter((g) => g.main !== originalMain && g.main !== group.main), group]);
    } else {
      setTripCustoms((prev) => [...prev.filter((g) => g.main !== group.main), group]);
    }
  }, [isSeedTrip]);

  // Removes a trip's custom overrides. For custom-only trips this deletes them;
  // for customized seed trips this reverts to system defaults.
  const deleteTrip = useCallback((main: string) => {
    setTripCustoms((prev) => prev.filter((g) => g.main !== main));
  }, []);

  // Soft refresh: re-read persisted trip overrides from localStorage.
  const reload = useCallback(() => {
    setTripCustoms(loadLS(LS_KEYS.TRIP_CUSTOMS, []));
    setTripDeleted(loadLS(LS_KEYS.TRIP_DELETED, []));
  }, []);

  return { mergedTripGroups, saveTrip, deleteTrip, reload } as const;
}
