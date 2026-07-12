import { memo } from "react";
import type { Country } from "@/core/types";
import type { TripScope } from "@/core/trip/destinationSource";
import PlanWorkspaceShell, { type RailDef, type WorkspaceNav } from "../shell/PlanWorkspaceShell";
import TripReviewCanvas from "./TripReviewCanvas";
import TripContextRail from "./TripContextRail";
import ItineraryToolbar from "../ui/ItineraryToolbar";
import { getCountryFlag } from "@/utils/countryFlags";
import type { CinematicRoute } from "@/components/country/cinematic/engine";
import type { ReviewRoute } from "./useReviewRoute";

type Props = {
  /** The order-aware composed route (from {@link useReviewRoute} in PlanView). */
  route: ReviewRoute;
  /** Primary destination the PDF/AI name after. */
  displayCountry: Country;
  homeCountry: string;
  /** Trip scope — molds readiness + leg framing in the rail. */
  scope?: TripScope;
  /** Scope-aware flag resolver (domestic stops read the home-country flag). */
  flagFor?: (name: string) => string;
  onPlanWithAi?: () => void;
  /** Primary destination notes (trip scratchpad in the rail). */
  notes: string;
  onSaveNotes?: (notes: string) => void;
  /** Mobile bottom-bar Back / Plan-another (desktop uses the wizard footer). */
  nav?: WorkspaceNav;
  /** Play the composed route as a cinematic fly-through (single + multi). */
  onStartCinematic?: (route: CinematicRoute) => void;
};

/**
 * The unified Review workspace — the "Route Canvas" — shared by single- and
 * multi-country trips. Consumes the order-aware {@link ReviewRoute} model (owned
 * by {@link useReviewRoute} in PlanView so the header Share reads the same ordered
 * plan) and lays out the composed segmented itinerary (centre, levers tuned in
 * place, stops reorderable) beside the unified "Insights" rail via the shared
 * {@link PlanWorkspaceShell}. Route order and anchor are independent display layers
 * over the pick-ordered segments, so reordering never unpicks the primary stop. At
 * N=1 the list is just the primary stop: the reorder/anchor levers mold away and
 * the workspace renders the single itinerary full-width with one reference rail, so
 * a single-country trip stays byte-identical to before. Each stop is shaped inline
 * (the ✏️ Adjust drawer) — there is no separate Shape rail. Share now lives in the
 * wizard header; the secondary toolbar (Cinematic/PDF/AI) is pinned on desktop or
 * opened from the mobile "More" sheet.
 */
function TripReviewWorkspaceInner({
  route,
  displayCountry,
  homeCountry,
  scope = "international",
  flagFor = getCountryFlag,
  onPlanWithAi,
  notes,
  onSaveNotes,
  nav,
  onStartCinematic,
}: Props) {
  const {
    orderedSegments,
    orderedCountries,
    orderedComposed,
    perCountryCost,
    routeStops,
    cinematicRoute,
    canCinematic,
    anchorName,
    setAnchor,
    reorderStop,
    autoArrange,
    canAutoArrange,
    ready,
  } = route;

  if (!ready) return null;

  // The composed itinerary's secondary action toolbar (Cinematic/PDF/AI — Share
  // is promoted to the wizard header). Built once here so it can live in two
  // places without duplicating props: pinned in the canvas foot on desktop, or in
  // the shell's "More" bottom-sheet below `lg`.
  const toolbar = (
    <ItineraryToolbar
      country={displayCountry}
      plan={orderedComposed}
      homeCountry={homeCountry}
      routeStops={routeStops}
      onPlanWithAi={onPlanWithAi}
      canCinematic={canCinematic}
      onCinematic={canCinematic ? () => onStartCinematic?.(cinematicRoute) : undefined}
    />
  );

  const center = (
    <TripReviewCanvas
      segments={orderedSegments}
      anchorName={anchorName}
      onSetAnchor={setAnchor}
      onReorder={reorderStop}
      onAutoArrange={autoArrange}
      canAutoArrange={canAutoArrange}
      toolbar={toolbar}
      flagFor={flagFor}
    />
  );

  const context: RailDef = {
    key: "context",
    title: "Insights",
    reopenLabel: "Insights",
    mobileLabel: "Insights",
    node: (
      <TripContextRail
        countries={orderedCountries}
        composedPlan={orderedComposed}
        perCountryCost={perCountryCost}
        homeCountry={homeCountry}
        scope={scope}
        notes={notes}
        onSaveNotes={onSaveNotes}
        flagFor={flagFor}
      />
    ),
  };

  return <PlanWorkspaceShell center={center} context={context} nav={nav} actions={toolbar} />;
}

const TripReviewWorkspace = memo(TripReviewWorkspaceInner);
export default TripReviewWorkspace;
