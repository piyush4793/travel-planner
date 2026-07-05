import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Country, CityEntry, TravelStyle } from "../core/types";
import type { CountryRule } from "../core/data/itineraryRules";
import {
  extractPlanCities,
  generateTripPlan,
  getMaxRuleDays,
  getRecRuleDays,
  recommendedDaysForSelection,
  type TripPlan,
} from "../core/utils/tripPlans";
import { budgetForBasis, type BudgetBasis } from "../core/utils/budget";
import { getBudgetTier } from "../core/utils/filterLogic";
import { mergeCountryData } from "../core/utils/countryData";
import { useCountryRule } from "./useCountryRule";

export interface PlanBuilder {
  displayCountry: Country | null;
  rule: CountryRule | null;
  ruleLoading: boolean;
  maxDays: number;
  recDays: number;
  safeMaxDays: number;
  primaryStyle: TravelStyle | undefined;
  selectedCities: string[];
  selectedExperiences: string[];
  customDays: number;
  daysPinned: boolean;
  recommendedDays: number;
  orderedCities: CityEntry[];
  plan: TripPlan | null;
  /** Ordered city route the current committed plan visits. */
  planCities: string[];
  /**
   * The country's own cities that the current auto plan actually visits — the
   * "auto-picked from your vibe" set shown pre-selected on the Places step.
   * Empty once the user hand-picks (then `selectedCities` is the source of truth).
   */
  autoSelectedCities: string[];
  /**
   * Cities the plan WOULD visit at a candidate day count, without committing.
   * Pure projection used to preview slider consequences on release.
   */
  projectCities: (days: number) => string[];
  toggleCity: (name: string) => void;
  toggleExperience: (tag: string) => void;
  clearCities: () => void;
  clearExperiences: () => void;
  /** Sets the day count and pins it (the auto-seed effect stops overriding it). */
  setDays: (days: number) => void;
  /** Clears the pin so the recommended length re-seeds. */
  resetDays: () => void;
}

/** Restorable funnel selections — rehydrated from a persisted draft on refresh. */
export type PlanBuilderInitial = {
  selectedCities?: string[];
  selectedExperiences?: string[];
  customDays?: number;
  daysPinned?: boolean;
};

/**
 * Encapsulates the Plan-tab intent funnel: rule loading, day auto-seed + pin,
 * and live plan generation. Data flows one way — party/vibe/length/cities shape
 * the plan; cities are a result you edit, never a filter that fights vibe.
 *
 * Purely local to the caller — never touches App/Calendar/global state.
 *
 * `initial` rehydrates the funnel for the current `country` (from a persisted
 * draft). It only seeds the first render; switching destinations still resets.
 */
export function usePlanBuilder(country: Country | null, budgetBasis: BudgetBasis, initial?: PlanBuilderInitial): PlanBuilder {
  const { data: consolidated, rule, loading: ruleLoading } = useCountryRule(country?.name);

  const [selectedCities, setSelectedCities] = useState<string[]>(initial?.selectedCities ?? []);
  const [selectedExperiences, setSelectedExperiences] = useState<string[]>(initial?.selectedExperiences ?? []);
  const [customDays, setCustomDays] = useState(initial?.customDays ?? 7);
  const [daysPinned, setDaysPinned] = useState(initial?.daysPinned ?? false);

  const maxDays = getMaxRuleDays(rule) ?? 30;
  const recDays = getRecRuleDays(rule) ?? 7;
  const safeMaxDays = Math.max(maxDays, 1);

  const displayCountry = useMemo(
    () => (country ? mergeCountryData(country, consolidated) : null),
    [country, consolidated],
  );
  const primaryStyle = displayCountry?.travelStyle?.[0];

  // Reset the funnel when switching destinations — but not on the first mount for
  // the initial country, so a rehydrated draft survives a page refresh.
  const prevName = useRef(country?.name);
  useEffect(() => {
    if (prevName.current === country?.name) return;
    prevName.current = country?.name;
    setDaysPinned(false);
    setSelectedCities([]);
    setSelectedExperiences([]);
  }, [country?.name]);

  const budgetTier = useMemo(
    () => (displayCountry ? getBudgetTier(budgetForBasis(displayCountry, budgetBasis)) : undefined),
    [displayCountry, budgetBasis],
  );

  const recommendedDays = useMemo(
    () =>
      recommendedDaysForSelection({
        rule,
        style: primaryStyle,
        recDays,
        maxDays: safeMaxDays,
        selectedCities,
        selectedExperiences,
        budgetTier,
      }),
    [rule, primaryStyle, recDays, safeMaxDays, selectedCities, selectedExperiences, budgetTier],
  );

  // Re-seed the day count from the recommendation until the user pins it.
  useEffect(() => {
    if (!daysPinned) setCustomDays(recommendedDays);
  }, [recommendedDays, daysPinned]);

  const orderedCities = useMemo(() => {
    const cities = displayCountry?.cities ?? [];
    if (selectedExperiences.length === 0) return cities;
    const matches = (c: CityEntry) => (c.experiences ?? []).some((e) => selectedExperiences.includes(e));
    return [...cities].sort((a, b) => Number(matches(b)) - Number(matches(a)));
  }, [displayCountry?.cities, selectedExperiences]);

  const plan = useMemo(
    () =>
      displayCountry
        ? generateTripPlan(displayCountry, "custom", selectedCities, customDays, rule, budgetBasis, selectedExperiences)
        : null,
    [displayCountry, selectedCities, customDays, rule, budgetBasis, selectedExperiences],
  );

  const planCities = useMemo(() => (plan ? extractPlanCities(plan.days) : []), [plan]);

  // The country's real cities that the auto plan visits — filters plan-route
  // labels down to actual city names so the Places step can pre-check them.
  // Only meaningful while in auto mode (no hand-picks yet).
  const autoSelectedCities = useMemo(() => {
    if (selectedCities.length > 0) return [];
    const names = new Set(planCities);
    return orderedCities.map((c) => c.name).filter((n) => names.has(n));
  }, [selectedCities.length, planCities, orderedCities]);

  const projectCities = useCallback(
    (days: number) => {
      if (!displayCountry) return [];
      const projected = generateTripPlan(displayCountry, "custom", selectedCities, days, rule, budgetBasis, selectedExperiences);
      return extractPlanCities(projected.days);
    },
    [displayCountry, selectedCities, rule, budgetBasis, selectedExperiences],
  );

  const toggleCity = useCallback((name: string) => {
    // Auto → explicit: start from the auto-picked set so what the user sees
    // checked stays consistent, then apply this toggle. Hold the current length
    // the moment they start curating (fine-tune later on the review slider).
    setSelectedCities((prev) => {
      const base = prev.length > 0 ? prev : autoSelectedCities;
      return base.includes(name) ? base.filter((c) => c !== name) : [...base, name];
    });
    setDaysPinned(true);
  }, [autoSelectedCities]);

  const toggleExperience = useCallback((tag: string) => {
    setSelectedExperiences((prev) => (prev.includes(tag) ? prev.filter((e) => e !== tag) : [...prev, tag]));
  }, []);

  const clearCities = useCallback(() => {
    setSelectedCities([]);
    setDaysPinned(false);
  }, []);
  const clearExperiences = useCallback(() => setSelectedExperiences([]), []);

  const setDays = useCallback((days: number) => {
    setCustomDays(days);
    setDaysPinned(true);
  }, []);

  const resetDays = useCallback(() => setDaysPinned(false), []);

  return {
    displayCountry,
    rule,
    ruleLoading,
    maxDays,
    recDays,
    safeMaxDays,
    primaryStyle,
    selectedCities,
    selectedExperiences,
    customDays,
    daysPinned,
    recommendedDays,
    orderedCities,
    plan,
    planCities,
    autoSelectedCities,
    projectCities,
    toggleCity,
    toggleExperience,
    clearCities,
    clearExperiences,
    setDays,
    resetDays,
  };
}
