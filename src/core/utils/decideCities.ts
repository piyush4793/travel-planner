import type { CityEntry } from "../types";
import type { CountryRule } from "../data/itineraryRules";
import { scoreCities } from "./citySelection";
import { formatMonthWindow } from "./months";

/**
 * A city rendered as a *decision*, not a checkbox. Everything a traveller needs
 * to judge "should this be in my trip?" is precomputed here so the view stays a
 * pure projection: recommended stay, which of THEIR focus experiences it serves
 * (lit) vs the rest (muted), when it's best to go, how it ranks, and a sparse
 * signal for the one theme it's iconic for.
 */
export interface CityDecision {
  name: string;
  included: boolean;
  /** Recommended nights from rule data (0 when the rule has no entry). */
  recDays: number;
  /** Focus experiences this city satisfies — rendered lit. */
  focusMatches: string[];
  /** Remaining experiences — rendered muted. */
  otherExperiences: string[];
  /** Best-time-to-go window (e.g. "May–Sep"), or null if unknown. */
  bestWindow: string | null;
  /** Months to avoid (e.g. "Nov–Feb"), or null if unknown. */
  avoidWindow: string | null;
  /** One-line "known for" brief (city notes), or null. */
  brief: string | null;
  /** Relative importance (0–1-ish) — drives "Most iconic" ordering. */
  importance: number;
  /** Sparse standout, e.g. "Top for Fjords" — at most one per city. */
  signal: string | null;
}

export type CitySort = "best" | "iconic" | "days";

export interface DecideCitiesInput {
  orderedCities: CityEntry[];
  selectedCities: string[];
  autoSelectedCities: string[];
  activeExperiences: string[];
  rule: CountryRule | null;
}

function pickSignal(rule: CountryRule | null, name: string, focus: string[]): string | null {
  const sig = rule?.cities[name]?.signatureExperiences ?? [];
  if (sig.length === 0) return null;
  const themed = sig.find((e) => focus.includes(e)) ?? sig[0];
  return `Top for ${themed}`;
}

/**
 * Project each ordered city into a {@link CityDecision}. Pure and deterministic:
 * `included` reflects hand-picks when present, else the vibe auto-plan. Output
 * stays in route order — {@link sortDecisions} handles presentation ordering.
 */
export function decideCities(input: DecideCitiesInput): CityDecision[] {
  const { orderedCities, selectedCities, autoSelectedCities, activeExperiences, rule } = input;
  const includedSet = new Set(selectedCities.length > 0 ? selectedCities : autoSelectedCities);
  const focus = activeExperiences;
  const importanceByName = new Map(rule ? scoreCities(rule).map((c) => [c.name, c.value]) : []);

  return orderedCities.map((city) => {
    const exps = city.experiences ?? [];
    const focusMatches = focus.length > 0 ? exps.filter((e) => focus.includes(e)) : [];
    const otherExperiences = exps.filter((e) => !focusMatches.includes(e));
    return {
      name: city.name,
      included: includedSet.has(city.name),
      recDays: rule?.cities[city.name]?.recDays ?? 0,
      focusMatches,
      otherExperiences,
      bestWindow: formatMonthWindow(city.bestMonths),
      avoidWindow: formatMonthWindow(city.worstMonths),
      brief: city.notes?.trim() || null,
      importance: importanceByName.get(city.name) ?? 0,
      signal: pickSignal(rule, city.name, focus),
    };
  });
}

/**
 * Order decisions for display without mutating the input. "Best match" leads
 * with the strongest focus fit then importance; "Most iconic" is importance-first;
 * "Fewest days" surfaces short stays. Ties fall back to route order (stable).
 */
export function sortDecisions(decisions: CityDecision[], sort: CitySort): CityDecision[] {
  const withIndex = decisions.map((d, i) => ({ d, i }));
  const cmp: Record<CitySort, (a: { d: CityDecision; i: number }, b: { d: CityDecision; i: number }) => number> = {
    best: (a, b) =>
      b.d.focusMatches.length - a.d.focusMatches.length ||
      b.d.importance - a.d.importance ||
      a.i - b.i,
    iconic: (a, b) => b.d.importance - a.d.importance || a.i - b.i,
    days: (a, b) => a.d.recDays - b.d.recDays || b.d.importance - a.d.importance || a.i - b.i,
  };
  return [...withIndex].sort(cmp[sort]).map((x) => x.d);
}

export const CITY_SORT_META: { key: CitySort; label: string }[] = [
  { key: "best", label: "Best match" },
  { key: "iconic", label: "Most iconic" },
  { key: "days", label: "Fewest days" },
];

/**
 * Overflow-safe one-liner for the active focus, e.g. `"Fjords, Food, History +2 more"`.
 * Caps at `max` names so the section subline never wraps or shifts the layout no
 * matter how many experiences are selected. Returns null when nothing is focused.
 */
export function summarizeFocus(experiences: string[], max = 3): string | null {
  if (experiences.length === 0) return null;
  if (experiences.length <= max) return experiences.join(", ");
  return `${experiences.slice(0, max).join(", ")} +${experiences.length - max} more`;
}
