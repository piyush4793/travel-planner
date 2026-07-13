import { useCallback, useEffect, useMemo, useState } from "react";
import type { Country } from "@/core/types";
import { type BudgetBasis } from "@/core/utils/budget";
import { composeTripPlan, type TripPlan } from "@/core/utils/tripPlans";
import { moveIndex, orderByProximity } from "@/core/utils/routeOrder";
import {
  buildCinematicRoute,
  resolveHomeOrigin,
  type CinematicRoute,
  type CinematicSegment,
} from "@/components/country/cinematic/engine";
import type { PlanBuilder } from "@/hooks/usePlanBuilder";
import type { UnitPlan } from "@/hooks/useTripPlanner";
import type { PdfRouteStop } from "@/utils/pdfModel";
import type { ReviewSegment } from "./TripReviewCanvas";
import type { TripCostRow } from "./TripContextRail";

type Params = {
  builder: PlanBuilder;
  unitPlans: UnitPlan[];
  secondaryCountries: Country[];
  budgetBasis: BudgetBasis;
  homeCountry: string;
  /** Whether the caller can play the composed route as a cinematic fly-through. */
  canStartCinematic: boolean;
};

/**
 * The composed Review route — the single source of truth for a trip's normalised
 * stops, visit order/anchor, folded plan, cost ledger, cinematic model and shared
 * PDF/share breakdown. Lifted out of the Route Canvas so both the wizard header
 * (Share, in `PlanView`) and the workspace read the *same* order-aware model:
 * reordering a stop is reflected everywhere at once. At N=1 the list is just the
 * primary stop, the levers mold away, and `orderedComposed` is byte-identical to
 * the single plan. Runs unconditionally (empty/no-plan yields a safe empty route),
 * so it obeys the rules of hooks even on non-Review steps.
 */
export type ReviewRoute = {
  segments: ReviewSegment[];
  orderedSegments: ReviewSegment[];
  orderedCountries: Country[];
  orderedComposed: TripPlan;
  perCountryCost: TripCostRow[];
  routeStops: PdfRouteStop[];
  cinematicRoute: CinematicRoute;
  canCinematic: boolean;
  anchorName: string;
  setAnchor: (name: string) => void;
  reorderStop: (from: number, to: number) => void;
  autoArrange: () => void;
  canAutoArrange: boolean;
  ready: boolean;
};

export function useReviewRoute({
  builder,
  unitPlans,
  secondaryCountries,
  budgetBasis,
  homeCountry,
  canStartCinematic,
}: Params): ReviewRoute {
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

  // Per-stop breakdown for the shared PDF/share model: the composed plan's
  // continuously-numbered days are sliced back per stop by these day counts,
  // giving each country its own PDF section. Scope-agnostic via ReviewSegment.
  const routeStops = useMemo<PdfRouteStop[]>(
    () =>
      orderedSegments.map((s) => ({
        name: s.name,
        dayCount: s.plan.days.length,
        cost: s.plan.costPerPerson,
        bestMonths: s.country?.bestMonths,
        note: s.plan.note,
        diet: s.country?.diet,
      })),
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
  const canCinematic = canStartCinematic && cinematicRoute.stops.length >= 2;

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

  const canAutoArrange =
    segments.length >= 3 && contextCountries.every((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng));

  return {
    segments,
    orderedSegments,
    orderedCountries,
    orderedComposed,
    perCountryCost,
    routeStops,
    cinematicRoute,
    canCinematic,
    anchorName,
    setAnchor: setAnchorName,
    reorderStop,
    autoArrange,
    canAutoArrange,
    ready: !!displayCountry && !!plan && segments.length > 0,
  };
}
