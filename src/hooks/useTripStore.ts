import { useState, useEffect, useCallback, useMemo } from "react";
import { loadLS, saveLS } from "../utils/storage";
import { LS_KEYS } from "../utils/lsKeys";
import { buildMergedTripGroups, type TripGroupDef } from "../data/tripGroups";
import type { Country } from "../types";

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

  const deleteTrip = useCallback((main: string) => {
    if (isSeedTrip(main)) {
      setTripDeleted((prev) => [...prev.filter((m) => m !== main), main]);
    }
    setTripCustoms((prev) => prev.filter((g) => g.main !== main));
  }, [isSeedTrip]);

  return { mergedTripGroups, saveTrip, deleteTrip } as const;
}
