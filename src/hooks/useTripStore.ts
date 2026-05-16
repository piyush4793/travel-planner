import { useState, useEffect, useCallback, useMemo } from "react";
import { loadLS, saveLS } from "../utils/storage";
import { TRIP_GROUPS, buildMergedTripGroups, type TripGroupDef } from "../data/tripGroups";

export function useTripStore(myListNames: string[]) {
  const [tripCustoms, setTripCustoms] = useState<TripGroupDef[]>(() => loadLS("tp_trip_customs", []));
  const [tripDeleted, setTripDeleted] = useState<string[]>(() => loadLS("tp_trip_deleted", []));

  useEffect(() => { saveLS("tp_trip_customs", tripCustoms); }, [tripCustoms]);
  useEffect(() => { saveLS("tp_trip_deleted", tripDeleted); }, [tripDeleted]);

  const mergedTripGroups = useMemo(
    () => buildMergedTripGroups(tripCustoms, tripDeleted, myListNames),
    [tripCustoms, tripDeleted, myListNames],
  );

  const saveTrip = useCallback((originalMain: string | null, group: TripGroupDef) => {
    if (originalMain && originalMain !== group.main) {
      if (TRIP_GROUPS.some((s) => s.main === originalMain)) {
        setTripDeleted((prev) => [...prev.filter((m) => m !== originalMain), originalMain]);
      }
      setTripCustoms((prev) => [...prev.filter((g) => g.main !== originalMain && g.main !== group.main), group]);
    } else {
      setTripCustoms((prev) => [...prev.filter((g) => g.main !== group.main), group]);
    }
  }, []);

  const deleteTrip = useCallback((main: string) => {
    if (TRIP_GROUPS.some((s) => s.main === main)) {
      setTripDeleted((prev) => [...prev.filter((m) => m !== main), main]);
    }
    setTripCustoms((prev) => prev.filter((g) => g.main !== main));
  }, []);

  return { mergedTripGroups, saveTrip, deleteTrip } as const;
}
