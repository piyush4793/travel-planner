import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { Country } from "../../../core/types";
import { type BudgetBasis } from "../../../core/utils/budget";
import { composeTripPlan } from "../../../core/utils/tripPlans";
import { moveIndex, orderByProximity } from "../../../core/utils/routeOrder";
import { buildCinematicRoute, resolveHomeOrigin, type CinematicRoute, type CinematicSegment } from "../../country/cinematic/engine";
import type { PlanBuilder } from "../../../hooks/usePlanBuilder";
import type { UnitPlan } from "../../../hooks/useTripPlanner";
import PlanWorkspaceShell, { type RailDef, type WorkspaceNav } from "./PlanWorkspaceShell";
import TripReviewCanvas, { type ReviewSegment } from "./TripReviewCanvas";
import TripContextRail, { type TripCostRow } from "./TripContextRail";
type Props = {
  /** Primary stop (route start). */
  builder: PlanBuilder;
  /** Additional stops in visit order. */
  unitPlans: UnitPlan[];
  /** Full country data for the additional stops (context rail), same order. */
  secondaryCountries: Country[];
  budgetBasis: BudgetBasis;
  homeCountry: string;
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
 * multi-country trips. Normalises the primary funnel + each additional stop into
 * one ordered {@link ReviewSegment} list, folds them into one plan in the current
 * visit order, and lays out the composed segmented itinerary (centre, levers tuned
 * in place, stops reorderable) beside the unified "Good to know" rail via the
 * shared {@link PlanWorkspaceShell}. Route order and anchor are independent display
 * layers over the pick-ordered segments, so reordering never unpicks the primary
 * stop. At N=1 the list is just the primary stop: the reorder/anchor levers mold
 * away and the workspace renders the single itinerary full-width with one reference
 * rail, so a single-country trip stays byte-identical to before. Each stop is
 * shaped inline (the ✏️ Adjust drawer) — there is no separate Shape rail.
 */
function TripReviewWorkspaceInner({
  builder,
  unitPlans,
  secondaryCountries,
  budgetBasis,
  homeCountry,
  onPlanWithAi,
  notes,
  onSaveNotes,
  nav,
  onStartCinematic,
}: Props) {
  const { displayCountry, plan } = builder;

  const segments = useMemo<ReviewSegment[]>(() => {
    if (!displayCountry || !plan) return [];
    const primary: ReviewSegment = {
      name: displayCountry.name,
      rule: builder.rule,
      plan,
      country: displayCountry,
      customDays: builder.customDays,
      recommendedDays: builder.recommendedDays,
      maxDays: builder.safeMaxDays,
      daysPinned: builder.daysPinned,
      selectedCities: builder.selectedCities,
      autoSelectedCities: builder.autoSelectedCities,
      orderedCities: builder.orderedCities,
      experienceOptions: displayCountry.experiences ?? [],
      selectedExperiences: builder.selectedExperiences,
      point: { lat: displayCountry.lat, lng: displayCountry.lng },
      projectCities: builder.projectCities,
      setDays: builder.setDays,
      resetDays: builder.resetDays,
      toggleCity: builder.toggleCity,
      clearCities: builder.clearCities,
      toggleExperience: builder.toggleExperience,
      clearExperiences: builder.clearExperiences,
    };
    const rest = unitPlans.map<ReviewSegment>((u, i) => ({
      name: u.name,
      rule: u.rule,
      plan: u.plan,
      country: secondaryCountries[i],
      customDays: u.customDays,
      recommendedDays: u.recommendedDays,
      maxDays: u.maxDays,
      daysPinned: u.daysPinned,
      selectedCities: u.selectedCities,
      autoSelectedCities: u.autoSelectedCities,
      orderedCities: u.orderedCities,
      experienceOptions: u.experienceOptions,
      selectedExperiences: u.experiences,
      point: secondaryCountries[i]
        ? { lat: secondaryCountries[i].lat, lng: secondaryCountries[i].lng }
        : undefined,
      projectCities: u.projectCities,
      setDays: u.setDays,
      resetDays: u.resetDays,
      toggleCity: u.toggleCity,
      clearCities: u.clearCities,
      toggleExperience: u.toggleExperience,
      clearExperiences: u.clearExperiences,
    }));
    return [primary, ...rest];
  }, [displayCountry, plan, builder, unitPlans, secondaryCountries]);

  const contextCountries = useMemo(
    () => (displayCountry ? [displayCountry, ...secondaryCountries] : secondaryCountries),
    [displayCountry, secondaryCountries],
  );

  // Route order (visit sequence) and anchor (importance ★) are independent axes.
  // Order is a display/ordering layer of indices over the pick-ordered segments —
  // it never unpicks the primary stop, preserving the byte-identical N=1 path.
  // Both reset when the pick set itself changes (add/remove a country).
  const routeNames = segments.map((s) => s.name).join("→");
  const [anchorName, setAnchorName] = useState(segments[0]?.name ?? "");
  const [order, setOrder] = useState<number[]>(() => segments.map((_, i) => i));
  useEffect(() => {
    setOrder(segments.map((_, i) => i));
    setAnchorName(segments[0]?.name ?? "");
    // Reset only when the pick set changes, not on reorder (routeNames is stable
    // across reorder since segments stay in pick order).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeNames]);

  const orderedSegments = useMemo(() => {
    const safe = order.length === segments.length ? order : segments.map((_, i) => i);
    return safe.map((i) => segments[i]);
  }, [order, segments]);

  const orderedCountries = useMemo(() => {
    const safe = order.length === segments.length ? order : segments.map((_, i) => i);
    return safe.map((i) => contextCountries[i]).filter(Boolean) as Country[];
  }, [order, segments, contextCountries]);

  // The whole route folded into one plan, in the current visit order — the one
  // shared plan the summary bar, jump nav, share/PDF and cost ledger all read.
  const orderedComposed = useMemo(
    () => composeTripPlan(orderedSegments.map((s) => ({ name: s.name, plan: s.plan })), budgetBasis),
    [orderedSegments, budgetBasis],
  );

  const perCountryCost = useMemo<TripCostRow[]>(
    () => orderedSegments.map((s) => ({ name: s.name, nights: s.customDays, cost: s.plan.costPerPerson })),
    [orderedSegments],
  );

  // The composed route as a scope-agnostic cinematic model, in visit order. One
  // builder serves single + multi (border hops derived per inter-unit leg); a
  // future domestic scope reuses it by swapping the origin. Guarded to ≥2 stops.
  const cinematicRoute = useMemo<CinematicRoute>(() => {
    const segs: CinematicSegment[] = orderedSegments.map((s) => ({
      name: s.name,
      center: s.country
        ? [s.country.lng, s.country.lat]
        : s.point
          ? [s.point.lng, s.point.lat]
          : [0, 0],
      plan: s.plan,
      cities: s.country?.cities ?? [],
      rule: s.rule,
    }));
    return buildCinematicRoute(segs, {
      title: orderedSegments.map((s) => s.name).join(" → "),
      plan: orderedComposed,
      origin: resolveHomeOrigin(homeCountry),
    });
  }, [orderedSegments, orderedComposed, homeCountry]);
  const canCinematic = !!onStartCinematic && cinematicRoute.stops.length >= 2;

  const reorderStop = useCallback(
    (from: number, to: number) => {
      setOrder((prev) => {
        const base = prev.length === segments.length ? prev : segments.map((_, i) => i);
        return moveIndex(base, from, to);
      });
    },
    [segments],
  );

  const autoArrange = useCallback(() => {
    const points = contextCountries.map((c) => ({ lat: c.lat, lng: c.lng }));
    const anchorIdx = Math.max(0, segments.findIndex((s) => s.name === anchorName));
    setOrder(orderByProximity(points, anchorIdx));
  }, [contextCountries, segments, anchorName]);

  if (!displayCountry || !plan || segments.length === 0) return null;

  const canAutoArrange = segments.length >= 3 && contextCountries.every((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng));

  const center = (
    <TripReviewCanvas
      segments={orderedSegments}
      composedPlan={orderedComposed}
      country={displayCountry}
      homeCountry={homeCountry}
      onPlanWithAi={onPlanWithAi}
      anchorName={anchorName}
      onSetAnchor={setAnchorName}
      onReorder={reorderStop}
      onAutoArrange={autoArrange}
      canAutoArrange={canAutoArrange}
      canCinematic={canCinematic}
      onCinematic={canCinematic ? () => onStartCinematic?.(cinematicRoute) : undefined}
    />
  );

  const context: RailDef = {
    key: "context",
    title: "Good to know",
    reopenLabel: "Details",
    mobileLabel: "📌 Good to know",
    node: (
      <TripContextRail
        countries={orderedCountries}
        composedPlan={orderedComposed}
        perCountryCost={perCountryCost}
        homeCountry={homeCountry}
        notes={notes}
        onSaveNotes={onSaveNotes}
      />
    ),
  };

  return <PlanWorkspaceShell center={center} context={context} nav={nav} />;
}

const TripReviewWorkspace = memo(TripReviewWorkspaceInner);
export default TripReviewWorkspace;
