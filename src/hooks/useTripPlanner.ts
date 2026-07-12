import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CityEntry } from "../core/types";
import type { CountryRule } from "../core/data/itineraryRules";
import type { LoadedUnit } from "../core/trip/destinationSource";
import {
  getMaxRuleDays,
  getRecRuleDays,
  recommendedDaysForSelection,
  composeTripPlan,
  type TripPlan,
  type TripSegment,
} from "../core/utils/tripPlans";
import { deriveStop, projectStopCities } from "../core/utils/stopPlan";
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
  /** Recommended length for this stop from its vibe/style/budget (the auto-seed). */
  recommendedDays: number;
  /** Max plannable days for this stop (rule bound, clamped ≥ 1). */
  maxDays: number;
  /** Whether the length was pinned by the traveller (auto-seed stops overriding). */
  daysPinned: boolean;
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
  /** Pin this stop's length (the auto-seed effect stops overriding it). */
  setDays: (days: number) => void;
  /** Clear this stop's length pin so the recommended length re-seeds. */
  resetDays: () => void;
  /** Cities this stop's plan WOULD visit at a candidate length, without committing. */
  projectCities: (days: number) => string[];
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
 * A one-shot restore of a reopened saved trip's *additional* stops, keyed by
 * country name and applied once per `nonce`. Mirrors {@link PlanBuilderSeed} for
 * the primary stop: each seeded stop is pinned to its snapshot cities + length.
 */
export type TripPlannerSeed = { nonce: number; byCountry: Record<string, { cities: string[]; days: number; experiences: string[] }> };

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
  seed?: TripPlannerSeed | null,
): { unitPlans: UnitPlan[]; composedPlan: (primary: TripSegment) => TripPlan } {
  const [state, setState] = useState<Record<string, UnitState>>({});
  const appliedSeedNonce = useRef<number | null>(null);

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
      // Mirror usePlanBuilder exactly: fold in this stop's hand-picked cities and
      // effective focus so the recommendation (and the "reset to recommended"
      // target) matches the single-country engine. An unpinned stop always has
      // no hand-picks, so this stays off the state→reseed effect loop.
      rec[country.name] = recommendedDaysForSelection({
        rule,
        style: country.travelStyle?.[0],
        recDays,
        maxDays,
        selectedCities: state[country.name]?.selectedCities ?? [],
        selectedExperiences: effectiveExperiences(country.name),
        budgetTier: getBudgetTier(budgetForBasis(country, basis)),
      });
    }
    return rec;
  }, [units, state, effectiveExperiences, basis]);

  // Re-seed each unpinned stop from its recommendation, and prune state for units
  // no longer selected so a dropped stop can't leak into a later composition. When
  // a saved trip is reopened, restore each additional stop to its snapshot cities
  // + length (pinned) — but only once every seeded stop has loaded, so a stop
  // whose rules arrive late still gets its snapshot (mirrors the primary restore).
  useEffect(() => {
    const unitNames = new Set(units.map((u) => u.country.name));
    const seedReady =
      seed != null &&
      appliedSeedNonce.current !== seed.nonce &&
      Object.keys(seed.byCountry).every((n) => unitNames.has(n));

    setState((prev) => {
      const next: Record<string, UnitState> = {};
      let changed = false;
      for (const { country } of units) {
        const rec = recommendedByName[country.name] ?? 7;
        const cur = prev[country.name];
        const restore = seedReady ? seed!.byCountry[country.name] : undefined;
        if (restore) {
          const cityNames = new Set((country.cities ?? []).map((c) => c.name));
          const restored: UnitState = {
            selectedCities: restore.cities.filter((c) => cityNames.has(c)),
            customDays: restore.days,
            pinned: true,
            experiences: restore.experiences,
          };
          next[country.name] = restored;
          if (
            !cur ||
            !cur.pinned ||
            cur.customDays !== restored.customDays ||
            (cur.experiences ?? []).join("\u0000") !== restored.experiences!.join("\u0000") ||
            cur.selectedCities.join("\u0000") !== restored.selectedCities.join("\u0000")
          ) {
            changed = true;
          }
        } else if (!cur) {
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

    if (seedReady) appliedSeedNonce.current = seed!.nonce;
  }, [units, recommendedByName, seed]);

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

  const setDays = useCallback((unitName: string, days: number) => {
    setState((prev) => {
      const cur = prev[unitName] ?? { selectedCities: [], customDays: days, pinned: false, experiences: null };
      return { ...prev, [unitName]: { ...cur, customDays: days, pinned: true } };
    });
  }, []);

  const resetDays = useCallback((unitName: string) => {
    setState((prev) => {
      const cur = prev[unitName];
      if (!cur || !cur.pinned) return prev;
      return { ...prev, [unitName]: { ...cur, pinned: false } };
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
      const recommendedDays = recommendedByName[country.name] ?? 7;
      const customDays = cur?.customDays ?? recommendedDays;
      const maxDays = Math.max(getMaxRuleDays(rule) ?? 30, 1);
      const daysPinned = cur?.pinned ?? false;

      const cities = country.cities ?? [];
      const experienceOptions = cityExperienceOptions(cities);
      // Surface only the focus this country can actually deliver: seed tags that
      // no city here offers are inert for its plan, so counting/showing them
      // (badge, subline, chips) would mislead. Clamp to the country's options.
      const experiences = (cur?.experiences ?? seedExperiences).filter((e) => experienceOptions.includes(e));

      const { orderedCities, plan, autoSelectedCities } = deriveStop({
        country,
        rule,
        selectedCities,
        days: customDays,
        experiences,
        basis,
      });

      return {
        name: country.name,
        rule,
        orderedCities,
        customDays,
        recommendedDays,
        maxDays,
        daysPinned,
        selectedCities,
        autoSelectedCities,
        experiences,
        experienceOptions,
        plan,
        toggleCity: (city: string) => toggleCity(country.name, city),
        clearCities: () => clearCities(country.name),
        setDays: (days: number) => setDays(country.name, days),
        resetDays: () => resetDays(country.name),
        projectCities: (days: number) =>
          projectStopCities({ country, rule, selectedCities, days, experiences, basis }),
        toggleExperience: (exp: string) => toggleExperience(country.name, exp),
        clearExperiences: () => clearExperiences(country.name),
      };
    });
  }, [units, state, recommendedByName, seedExperiences, basis, toggleCity, clearCities, setDays, resetDays, toggleExperience, clearExperiences]);

  const composedPlan = useCallback(
    (primary: TripSegment) =>
      composeTripPlan([primary, ...unitPlans.map((u) => ({ name: u.name, plan: u.plan }))], basis),
    [unitPlans, basis],
  );

  return { unitPlans, composedPlan };
}
