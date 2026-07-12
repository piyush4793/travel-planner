import { useCallback, useEffect, useState } from "react";
import { loadLS, saveLS } from "@/core/storage";
import { LS_KEYS } from "@/core/lsKeys";
import type { TripScope } from "@/core/trip/destinationSource";

const isScope = (v: unknown): v is TripScope => v === "international" || v === "domestic";

/**
 * The active Plan scope (International world countries vs Domestic India states),
 * persisted to its own key so the landing toggle survives a refresh even before a
 * draft exists. `initial` (e.g. a resumed draft's scope) wins over the stored
 * value on first mount so reopening a saved trip lands in the right source.
 */
export function usePlanScope(initial?: TripScope): [TripScope, (s: TripScope) => void] {
  const [scope, setScopeState] = useState<TripScope>(
    () => initial ?? loadLS<TripScope>(LS_KEYS.PLAN_SCOPE, "international", isScope),
  );
  const setScope = useCallback((s: TripScope) => setScopeState(s), []);
  useEffect(() => {
    saveLS(LS_KEYS.PLAN_SCOPE, scope);
  }, [scope]);
  return [scope, setScope];
}
