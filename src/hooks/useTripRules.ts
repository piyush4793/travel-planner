import { useEffect, useState } from "react";
import type { DestinationSource, LoadedUnit } from "../core/trip/destinationSource";

const KEY_SEP = "\u0000";

/**
 * Loads the plan-ready {@link LoadedUnit} (merged country + rule) for each
 * selected unit name via the given {@link DestinationSource}. Unit detail data
 * is fetched on demand, so this hook owns the async lifecycle and guards against
 * stale updates when the selection changes rapidly (each run is tagged and only
 * the latest wins). Unknown units are dropped, so the returned array can be
 * shorter than `names`. Returns an empty list while there is nothing selected.
 */
export function useTripRules(
  names: string[],
  source: DestinationSource,
): { units: LoadedUnit[]; loading: boolean } {
  const key = names.join(KEY_SEP);
  const [units, setUnits] = useState<LoadedUnit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const wanted = key ? key.split(KEY_SEP) : [];
    if (wanted.length === 0) {
      setUnits([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    Promise.all(wanted.map((name) => source.loadUnit(name)))
      .then((loaded) => {
        if (!active) return;
        setUnits(loaded.filter((u): u is LoadedUnit => u != null));
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setUnits([]);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [key, source]);

  return { units, loading };
}
