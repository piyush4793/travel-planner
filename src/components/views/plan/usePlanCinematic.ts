import { useEffect, useState } from "react";
import type { CinematicRoute } from "../../country/cinematic/engine";
import { useBackDismiss } from "../../../hooks/useBackDismiss";

interface Options {
  /** Route-identity signature (e.g. "Norway → Denmark"). Changing it auto-closes the overlay. */
  selectionSig: string;
  /** Reports open/close so App can reveal the hidden MapView behind the wizard. */
  onCinematicChange?: (active: boolean) => void;
}

interface PlanCinematic {
  cinematicRoute: CinematicRoute | null;
  openCinematic: (route: CinematicRoute) => void;
  closeCinematic: () => void;
}

/**
 * Owns the Plan wizard's cinematic overlay lifecycle so PlanView stays a thin
 * orchestrator. Reports open/close, auto-closes when the route identity changes
 * (a different selection means the played route no longer matches the screen),
 * cleans up on unmount, and wires device/browser Back to close the overlay
 * first (it lands on top of the wizard's LIFO back-stack).
 */
export function usePlanCinematic({ selectionSig, onCinematicChange }: Options): PlanCinematic {
  const [cinematicRoute, setCinematicRoute] = useState<CinematicRoute | null>(null);

  useEffect(() => {
    onCinematicChange?.(cinematicRoute !== null);
  }, [cinematicRoute, onCinematicChange]);

  useEffect(() => {
    setCinematicRoute(null);
  }, [selectionSig]);

  useEffect(() => () => onCinematicChange?.(false), [onCinematicChange]);

  useBackDismiss(cinematicRoute !== null, () => setCinematicRoute(null));

  return {
    cinematicRoute,
    openCinematic: setCinematicRoute,
    closeCinematic: () => setCinematicRoute(null),
  };
}
