import { useEffect, useState } from "react";
import type { DestinationSource } from "../core/trip/destinationSource";

const KEY_SEP = "\u0000";

/**
 * Resolves the union of experience tags offered by the selected units for the
 * given {@link DestinationSource}. The list is loaded on demand (per-unit detail
 * data), so this hook owns the async lifecycle and guards against stale updates
 * when the selection changes rapidly (each run is tagged and only the latest
 * wins). Returns an empty list while there is nothing selected.
 */
export function useTripExperiences(
  names: string[],
  source: DestinationSource,
): { experiences: string[]; loading: boolean } {
  const key = names.join(KEY_SEP);
  const [experiences, setExperiences] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const units = key ? key.split(KEY_SEP) : [];
    if (units.length === 0) {
      setExperiences([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    source
      .experiencesFor(units)
      .then((result) => {
        if (!active) return;
        setExperiences(result);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setExperiences([]);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [key, source]);

  return { experiences, loading };
}
