import { useCallback, useEffect, useMemo, useState } from "react";
import type { CityEntry } from "../core/types";
import type { CountryRule } from "../core/data/itineraryRules";
import type { LoadedUnit } from "../core/trip/destinationSource";
import {
  extractPlanCities,
  generateTripPlan,
  getMaxRuleDays,
  getRecRuleDays,
  recommendedDaysForSelection,
  composeTripPlan,
  type TripPlan,
  type TripSegment,
} from "../core/utils/tripPlans";
import { budgetForBasis, type BudgetBasis } from "../core/utils/budget";
import { getBudgetTier } from "../core/utils/filterLogic";
import { cityExperienceOptions } from "../core/utils/cityExperiences";

/** Per-unit intent + derived plan for one stop on a multi-unit route. */
export interface UnitPlan {
  name: string;
  rule: CountryRule | null;
  /** Cities in vibe-first order (experience matches surface first). */
  orderedCities: CityEntry[];
  /** Committed length for this stop (auto-seeded, or pinned by editing). */
  customDays: number;
  /** Hand-picked cities; empty means "follow the auto plan". */
  selectedCities: string[];
  /** The unit's own cities the auto plan visits — pre-checked when not curated. */
  autoSelectedCities: string[];
  /** This stop's *effective* experience focus (its override, else the trip seed). */
  experiences: string[];
  /** This stop's available experience tags (from its cities), for the Filters UI. */
  experienceOptions: string[];
  /** This stop's itinerary. */
  plan: TripPlan;
  toggleCity: (city: string) => void;
  clearCities: () => void;
  /** Toggle one experience for THIS stop only (diverges from the trip seed). */
  toggleExperience: (exp: string) => void;
  /** Clear THIS stop's experience focus (explicit none, independent of others). */
  clearExperiences: () => void;
}

/**
 * `experiences: null` means "inherit the trip seed"; a non-null array is an
 * explicit per-stop override (including `[]` for "deliberately none here").
 */
type UnitState = { selectedCities: string[]; customDays: number; pinned: boolean; experiences: string[] | null };

/**
 * Owns the per-unit funnel for the *additional* stops of a multi-unit route
 * (the primary stop stays on {@link usePlanBuilder}). Given the loaded units, the
 * trip's *seed* vibe (from Basics) and the budget basis, it derives each stop's
 * itinerary and exposes per-unit city AND experience curation — then composes
 * every stop (primary first) into one honest trip plan via {@link composeTripPlan}.
 *
 * Experiences are per-country: each stop inherits the trip seed until the
 * traveller diverges it, so Norway can chase fjords while Denmark chases design.
 *
 * One hook managing arrays internally, never `usePlanBuilder` in a loop, so the
 * rules of hooks hold as the selection grows or shrinks. Scope-agnostic: units
 * arrive already resolved through the {@link DestinationSource} seam.
 */
export function useTripPlanner(
  units: LoadedUnit[],
  seedExperiences: string[],
  basis: BudgetBasis,
): { unitPlans: UnitPlan[]; composedPlan: (primary: TripSegment) => TripPlan } {
  const [state, setState] = useState<Record<string, UnitState>>({});

  // A stop's effective focus: its explicit override, else the trip seed.
  const effectiveExperiences = useCallback(
    (name: string) => state[name]?.experiences ?? seedExperiences,
    [state, seedExperiences],
  );

  const recommendedByName = useMemo(() => {
    const rec: Record<string, number> = {};
    for (const { country, rule } of units) {
      const recDays = getRecRuleDays(rule) ?? 7;
      const maxDays = Math.max(getMaxRuleDays(rule) ?? 30, 1);
      // Seeds only unpinned stops, which have no hand-picked cities, so the
      // recommendation is independent of curation state (keeps this off the
      // state→reseed effect loop). Uses the stop's effective focus so changing a
      // country's vibe re-seeds its length.
      rec[country.name] = recommendedDaysForSelection({
        rule,
        style: country.travelStyle?.[0],
        recDays,
        maxDays,
        selectedCities: [],
        selectedExperiences: effectiveExperiences(country.name),
        budgetTier: getBudgetTier(budgetForBasis(country, basis)),
      });
    }
    return rec;
  }, [units, effectiveExperiences, basis]);

  // Re-seed each unpinned stop from its recommendation, and prune state for units
  // no longer selected so a dropped stop can't leak into a later composition.
  useEffect(() => {
    setState((prev) => {
      const next: Record<string, UnitState> = {};
      let changed = false;
      for (const { country } of units) {
        const rec = recommendedByName[country.name] ?? 7;
        const cur = prev[country.name];
        if (!cur) {
          next[country.name] = { selectedCities: [], customDays: rec, pinned: false, experiences: null };
          changed = true;
        } else if (!cur.pinned && cur.customDays !== rec) {
          next[country.name] = { ...cur, customDays: rec };
          changed = true;
        } else {
          next[country.name] = cur;
        }
      }
      if (!changed && Object.keys(prev).length === Object.keys(next).length) return prev;
      return next;
    });
  }, [units, recommendedByName]);

  const toggleCity = useCallback((unitName: string, city: string) => {
    setState((prev) => {
      const cur = prev[unitName] ?? { selectedCities: [], customDays: 7, pinned: false, experiences: null };
      const base = cur.selectedCities;
      const selectedCities = base.includes(city) ? base.filter((c) => c !== city) : [...base, city];
      return { ...prev, [unitName]: { ...cur, selectedCities, pinned: true } };
    });
  }, []);

  const clearCities = useCallback((unitName: string) => {
    setState((prev) => {
      const cur = prev[unitName];
      if (!cur) return prev;
      return { ...prev, [unitName]: { ...cur, selectedCities: [], pinned: false } };
    });
  }, []);

  // Diverge one stop's focus from the trip seed. Starts from its effective focus
  // so the first toggle behaves predictably, then persists as an explicit override.
  const toggleExperience = useCallback((unitName: string, exp: string) => {
    setState((prev) => {
      const cur = prev[unitName] ?? { selectedCities: [], customDays: 7, pinned: false, experiences: null };
      const base = cur.experiences ?? seedExperiences;
      const experiences = base.includes(exp) ? base.filter((e) => e !== exp) : [...base, exp];
      return { ...prev, [unitName]: { ...cur, experiences } };
    });
  }, [seedExperiences]);

  const clearExperiences = useCallback((unitName: string) => {
    setState((prev) => {
      const cur = prev[unitName] ?? { selectedCities: [], customDays: 7, pinned: false, experiences: null };
      return { ...prev, [unitName]: { ...cur, experiences: [] } };
    });
  }, []);

  const unitPlans = useMemo<UnitPlan[]>(() => {
    return units.map(({ country, rule }) => {
      const cur = state[country.name];
      const selectedCities = cur?.selectedCities ?? [];
      const customDays = cur?.customDays ?? recommendedByName[country.name] ?? 7;

      const cities = country.cities ?? [];
      const experienceOptions = cityExperienceOptions(cities);
      // Surface only the focus this country can actually deliver: seed tags that
      // no city here offers are inert for its plan, so counting/showing them
      // (badge, subline, chips) would mislead. Clamp to the country's options.
      const experiences = (cur?.experiences ?? seedExperiences).filter((e) => experienceOptions.includes(e));

      const matches = (c: CityEntry) => (c.experiences ?? []).some((e) => experiences.includes(e));
      const orderedCities =
        experiences.length === 0
          ? cities
          : [...cities].sort((a, b) => Number(matches(b)) - Number(matches(a)));

      const plan = generateTripPlan(country, "custom", selectedCities, customDays, rule, basis, experiences);
      const planCities = new Set(extractPlanCities(plan.days));
      const autoSelectedCities =
        selectedCities.length > 0 ? [] : orderedCities.map((c) => c.name).filter((n) => planCities.has(n));

      return {
        name: country.name,
        rule,
        orderedCities,
        customDays,
        selectedCities,
        autoSelectedCities,
        experiences,
        experienceOptions,
        plan,
        toggleCity: (city: string) => toggleCity(country.name, city),
        clearCities: () => clearCities(country.name),
        toggleExperience: (exp: string) => toggleExperience(country.name, exp),
        clearExperiences: () => clearExperiences(country.name),
      };
    });
  }, [units, state, recommendedByName, seedExperiences, basis, toggleCity, clearCities, toggleExperience, clearExperiences]);

  const composedPlan = useCallback(
    (primary: TripSegment) =>
      composeTripPlan([primary, ...unitPlans.map((u) => ({ name: u.name, plan: u.plan }))], basis),
    [unitPlans, basis],
  );

  return { unitPlans, composedPlan };
}
