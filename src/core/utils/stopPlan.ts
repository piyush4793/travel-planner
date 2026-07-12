import type { Country, CityEntry } from "../types";
import type { CountryRule } from "../data/itineraryRules";
import type { BudgetBasis } from "./budget";
import { extractPlanCities, generateTripPlan, type TripPlan } from "./tripPlans";

/**
 * The single per-stop derivation engine shared by {@link usePlanBuilder} (the
 * primary stop) and {@link useTripPlanner} (the additional stops), so a stop
 * plans identically wherever it sits on a route — single-country is just the
 * N=1 case of the same engine. Pure: inputs arrive already resolved (effective
 * experiences, committed day count); no React, no state, no I/O.
 */
export interface StopDerivationInput {
  country: Country;
  rule: CountryRule | null;
  /** Hand-picked cities; empty means "follow the auto plan". */
  selectedCities: string[];
  /** Committed length for this stop. */
  days: number;
  /** This stop's effective experience focus. */
  experiences: string[];
  basis: BudgetBasis;
}

export interface StopDerivation {
  /** Cities in vibe-first order (experience matches surface first). */
  orderedCities: CityEntry[];
  /** This stop's itinerary at the committed length. */
  plan: TripPlan;
  /** Ordered city route the committed plan visits. */
  planCities: string[];
  /**
   * The stop's own cities the auto plan actually visits — the "auto-picked from
   * your vibe" set shown pre-selected. Empty once the user hand-picks (then
   * `selectedCities` is the source of truth).
   */
  autoSelectedCities: string[];
}

/** Vibe-first city ordering: experience matches surface first (stable otherwise). */
export function orderCitiesByExperience(cities: CityEntry[], experiences: string[]): CityEntry[] {
  if (experiences.length === 0) return cities;
  const matches = (c: CityEntry) => (c.experiences ?? []).some((e) => experiences.includes(e));
  return [...cities].sort((a, b) => Number(matches(b)) - Number(matches(a)));
}

/** Generate this stop's itinerary from its committed intent. */
export function stopPlan(input: StopDerivationInput): TripPlan {
  const { country, selectedCities, days, rule, basis, experiences } = input;
  return generateTripPlan(country, selectedCities, days, rule, basis, experiences);
}

/** Cities this stop's plan WOULD visit at a candidate length, without committing. */
export function projectStopCities(input: StopDerivationInput): string[] {
  return extractPlanCities(stopPlan(input).days);
}

/** Derive a stop's ordered cities, plan, plan-route cities and auto-picked set. */
export function deriveStop(input: StopDerivationInput): StopDerivation {
  const cities = input.country.cities ?? [];
  const orderedCities = orderCitiesByExperience(cities, input.experiences);
  const plan = stopPlan(input);
  const planCities = extractPlanCities(plan.days);
  const names = new Set(planCities);
  const autoSelectedCities =
    input.selectedCities.length > 0 ? [] : orderedCities.map((c) => c.name).filter((n) => names.has(n));
  return { orderedCities, plan, planCities, autoSelectedCities };
}
