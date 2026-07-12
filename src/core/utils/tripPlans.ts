import type { Country, CityEntry } from "../types";
import type { CountryRule } from "../data/itineraryRules";
import { scoreCities, planItinerary } from "./citySelection";
import { budgetForBasis, parseBudgetRange, BUDGET_BASIS_META, DEFAULT_BUDGET_BASIS, type BudgetBasis } from "./budget";
import { experienceTokens, tokenHits, matchCityExperiences, ruleCityText } from "./cityExperiences";

export type DayEntry = {
  label: string;
  activities: string[];
  theme?: string;
  hotels?: string[];
};

export type TripPlan = {
  duration: string;
  costPerPerson: string;
  days: DayEntry[];
  note: string;
  warning?: string;
  /** Party basis the cost is computed for. Absent for AI plans (per-person). */
  costBasis?: BudgetBasis;
};

/** Basis icon for a plan's cost figure (person icon for AI/per-person plans). */
export function planCostBasisIcon(plan: TripPlan): string {
  return plan.costBasis ? BUDGET_BASIS_META[plan.costBasis].icon : "👤";
}

/** Accessible label for a plan's cost basis — for `title`/`aria-label` only, never rendered as visible text. */
export function planCostBasisLabel(plan: TripPlan): string {
  return plan.costBasis ? BUDGET_BASIS_META[plan.costBasis].long : "per person";
}

/** Extract city name from a day label like "Day 1 — Oslo" */
export function extractCityFromLabel(label: string): string {
  // Strip a leading "Day N" / "Day N–M" counter and its separator; the remainder
  // is the place. Handling the counter explicitly stops a hyphen/en-dash day range
  // (e.g. "Day 1–5 — Alpha") from being mistaken for the city separator, which
  // would otherwise capture "5 — Alpha".
  const stripped = label.replace(/^\s*Day\s+\d+(?:\s*[–-]\s*\d+)?\s*[—–-]\s*/, "");
  if (stripped !== label) return stripped.trim();
  const m = label.match(/[—\-–]\s*(.+)$/);
  return m ? m[1].trim() : "";
}

/**
 * Shift every "Day N" / "Day N–M" number in a piece of itinerary text by
 * `offset`, leaving the surrounding text (city, theme, activity copy) untouched.
 * The range separator class is en-dash/hyphen only, so the " — City" em-dash that
 * follows a single-day label is never mistaken for a range. `offset === 0` returns
 * the input unchanged so the single-country path stays byte-identical.
 */
export function shiftDayNumbers(text: string, offset: number): string {
  if (!offset) return text;
  return text.replace(
    /Day\s+(\d+)(?:(\s*[–-]\s*)(\d+))?/g,
    (_m, a: string, sep: string | undefined, b: string | undefined) =>
      sep !== undefined && b !== undefined
        ? `Day ${Number(a) + offset}${sep}${Number(b) + offset}`
        : `Day ${Number(a) + offset}`,
  );
}

/**
 * Renumber a stop's days for a route-continuous view: shifts the "Day N" numbers
 * in each day's label and activity copy by `offset` (the count of days that
 * precede this stop on the route). Returns a new array; `offset === 0` returns the
 * original reference so composing a single stop is a no-op.
 */
export function shiftPlanDays(days: DayEntry[], offset: number): DayEntry[] {
  if (!offset) return days;
  return days.map((d) => ({
    ...d,
    label: shiftDayNumbers(d.label, offset),
    activities: d.activities.map((a) => shiftDayNumbers(a, offset)),
  }));
}

/** Extract unique ordered city route from plan days */
export function extractPlanCities(days: DayEntry[]): string[] {
  const cities: string[] = [];
  for (const day of days) {
    const city = extractCityFromLabel(day.label);
    if (city && cities[cities.length - 1] !== city) cities.push(city);
  }
  return cities;
}

/** Filter out noise entries that aren't real cities (import artifacts) */
export function isRealCity(name: string): boolean {
  return (
    name.length >= 2 &&
    !/^(?:stay:\s|return|departure|depart|transit|arrive|entry costs|recommended hotels|mostly free|fly\s*back)/i.test(name)
  );
}

/** Normalize city name for case-insensitive comparison */
export function normalizeCityName(name: string): string {
  return name.replace(/^stay:\s*/i, "").trim().toLowerCase();
}

function parseCostRange(budget: string | { solo: string; couple: string; family4: string }): [number, number] {
  const str = typeof budget === "string" ? budget : budget.couple;
  return parseBudgetRange(str) ?? [100000, 200000];
}

function fmt(n: number): string {
  if (n >= 100000) {
    const l = n / 100000;
    return `₹${Number.isInteger(l) ? l : l.toFixed(1)}L`;
  }
  return `₹${Math.round(n / 1000)}K`;
}

function costRange(low: number, high: number): string {
  return `${fmt(low)} – ${fmt(high)}`;
}

function act(exp?: string): string {
  if (!exp) return "Explore at your own pace";
  const lower = exp.toLowerCase();
  if (/museum|gallery|memorial|palace|castle/.test(lower)) return `Visit ${exp}`;
  if (/temple|shrine|monastery|mosque|cathedral|church/.test(lower)) return `Explore ${exp}`;
  if (/food|cuisine|market|street food|tasting|wine|beer|sake/.test(lower)) return `Savour ${exp}`;
  if (/hik|trek|trail|climb|summit/.test(lower)) return `Trek — ${exp}`;
  if (/beach|island|coast|bay|lagoon/.test(lower)) return `Relax at ${exp}`;
  if (/safari|wildlife|national park|reserve/.test(lower)) return `Safari — ${exp}`;
  if (/diving|snorkel|surf|kayak|raft/.test(lower)) return `Try ${exp}`;
  if (/cruise|boat|ferry|canal/.test(lower)) return `Cruise — ${exp}`;
  if (/northern lights|aurora/.test(lower)) return `Chase ${exp}`;
  if (/night ?life|bar|club/.test(lower)) return `Experience ${exp}`;
  return `Discover ${exp}`;
}

function allocateDays(total: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(total / n);
  const extra = total % n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
}

function cityBlock(city: CityEntry, daysCount: number, dayStart: number, exps: string[]): DayEntry {
  const end = dayStart + daysCount - 1;
  const label = daysCount === 1
    ? `Day ${dayStart} — ${city.name}`
    : `Day ${dayStart}–${end} — ${city.name}`;

  const activities: string[] = [];

  if (city.notes) {
    const highlights = city.notes.split(",").slice(0, 2).map(s => s.trim());
    activities.push(`Explore: ${highlights[0]}`);
    if (highlights[1]) activities.push(`Visit: ${highlights[1]}`);
  } else {
    activities.push(`Arrive in ${city.name} and orient yourself`);
    activities.push(act(exps[0] ?? city.name));
  }

  if (daysCount >= 2) activities.push(`Day ${dayStart + 1}: local food, markets and hidden gems`);
  if (daysCount >= 3) activities.push(act(exps[1] ?? "local neighbourhood walk"));
  if (daysCount >= 4) activities.push(`Day ${dayStart + 3}: day trip from ${city.name}`);

  return { label, activities };
}

function cityBasedPlan(
  country: Country,
  selectedCities: string[],
  totalDays: number,
  costLow: number,
  costHigh: number,
  warning?: string,
): TripPlan {
  const cityObjs = country.cities ?? [];
  const chosen = selectedCities
    .map(n => cityObjs.find(c => c.name === n))
    .filter((c): c is CityEntry => c !== undefined);

  const perCity = allocateDays(totalDays, chosen.length);
  const days: DayEntry[] = [];
  let dayIdx = 1;

  chosen.forEach((city, i) => {
    days.push(cityBlock(city, perCity[i], dayIdx, country.experiences));
    dayIdx += perCity[i];
  });

  const bestTime = country.bestMonths.slice(0, 3).join(", ");
  // Guard against selected city names that match no rule city (e.g. a stale
  // saved trip): chosen can be empty even when selectedCities isn't.
  const avgPerCity = chosen.length > 0 ? (totalDays / chosen.length).toFixed(1) : "0";

  return {
    duration: `${totalDays} day${totalDays !== 1 ? "s" : ""}`,
    costPerPerson: costRange(costLow, costHigh),
    days,
    note: `~${avgPerCity} days per city. Best months: ${bestTime}.`,
    warning,
  };
}

/** Calculate the max useful days from a loaded rule */
export function getMaxRuleDays(rule: CountryRule | null | undefined): number | null {
  if (!rule) return null;
  return rule.cityOrder
    .filter((c) => rule.cities[c])
    .reduce((s, c) => s + rule.cities[c].maxDays, 0);
}

/** Calculate the recommended days from a loaded rule */
export function getRecRuleDays(rule: CountryRule | null | undefined): number | null {
  if (!rule) return null;
  return rule.cityOrder
    .filter((c) => rule.cities[c])
    .reduce((s, c) => s + rule.cities[c].recDays, 0);
}

/** Budget-tier nudge applied to the recommended trip length. */
export const BUDGET_DAY_FACTOR: Record<"budget" | "mid" | "premium", number> = {
  budget: 0.85,
  mid: 1,
  premium: 1.15,
};

/**
 * How many cities an experience-only focus expands to. A focus experience should
 * anchor the trip on the one or two cities that deliver it best — not every city
 * that happens to list it — so both the day estimate and the auto-built plan stay
 * tight and relevant.
 */
export const EXPERIENCE_CITY_LIMIT = 2;

/**
 * Pick the cities that best deliver the selected experiences.
 *
 * Coverage-first: with several experiences selected, each one contributes its
 * strongest city (a city that satisfies multiple selected tags counts once), so
 * the trip covers every chosen theme rather than piling onto whichever theme
 * happens to own the highest-importance cities. Example: Fjords + Northern
 * Lights returns one top fjords city AND one top northern-lights city, not the
 * two biggest northern-lights cities.
 *
 * With a single experience selected, returns the top `limit` cities delivering
 * it, strongest first. Strength ranks by the city's base importance
 * (`scoreCities`: rec days + content depth + route prominence). Returns [] when
 * nothing matches. Pure — shared by the day estimator and the engine's
 * auto-selection so they agree on which cities an experience focus implies.
 */
/**
 * Confidence that a city delivers an experience, highest wins:
 *  3 — signature: the city is THE iconic place for it (authored `signatureExperiences`),
 *  2 — authored: listed in the city's authored `experiences` array,
 *  1 — derived: no authored array, matched from the city's content keywords,
 *  0 — no match. An authored `experiences` array is authoritative: an experience
 * omitted from it scores 0 and is never re-derived, so a genuine Fjords city
 * stays ahead of one that merely name-drops one (e.g. Oslo → "Oslofjord").
 * Pure. Exported so the day estimator, ranking and coverage checks share one
 * definition of "how strongly does this city deliver this experience".
 */
export function cityExperienceStrength(
  rule: CountryRule,
  cityName: string,
  experience: string,
): number {
  const cr = rule.cities[cityName];
  if (!cr) return 0;
  if (Array.isArray(cr.signatureExperiences) && cr.signatureExperiences.includes(experience)) return 3;
  if (Array.isArray(cr.experiences)) return cr.experiences.includes(experience) ? 2 : 0;
  return matchCityExperiences(ruleCityText(cr), [experience]).includes(experience) ? 1 : 0;
}

/**
 * Cities delivering `experience`, strongest first: by `cityExperienceStrength`
 * (signature > authored > derived) then base importance (`scoreCities`).
 */
function rankedExperienceCities(rule: CountryRule, experience: string): string[] {
  return scoreCities(rule)
    .map((c) => ({ name: c.name, s: cityExperienceStrength(rule, c.name, experience), value: c.value }))
    .filter((c) => c.s > 0)
    .sort((a, b) => b.s - a.s || b.value - a.value)
    .map((c) => c.name);
}

/**
 * One champion city per experience (coverage-first): each experience contributes
 * its single strongest city, and a city already covering an earlier experience
 * is not added twice (a city satisfying several selected tags counts once). This
 * is what makes Fjords + Northern Lights return one top fjords city AND one top
 * northern-lights city, rather than the two biggest cities of a single theme.
 */
function experienceChampions(rule: CountryRule, experiences: string[]): string[] {
  const picked: string[] = [];
  for (const exp of experiences) {
    if (picked.some((name) => cityExperienceStrength(rule, name, exp) > 0)) continue;
    const champion = rankedExperienceCities(rule, exp)[0];
    if (champion && !picked.includes(champion)) picked.push(champion);
  }
  return picked;
}

/**
 * Pick the cities that best deliver the selected experiences.
 *
 * With a single experience, returns its top `limit` cities, strongest first.
 * With several, delegates to `experienceChampions` (one champion per theme) so
 * the trip covers every chosen experience rather than piling onto whichever
 * theme owns the highest-importance cities. Returns [] when nothing matches.
 * Pure — shared by the day estimator and the engine's auto-selection so they
 * agree on which cities an experience focus implies.
 */
export function topExperienceCities(
  rule: CountryRule,
  selectedExperiences: string[],
  limit: number = EXPERIENCE_CITY_LIMIT,
): string[] {
  if (selectedExperiences.length === 0) return [];
  if (selectedExperiences.length === 1) {
    return rankedExperienceCities(rule, selectedExperiences[0]).slice(0, Math.max(1, limit));
  }
  return experienceChampions(rule, selectedExperiences);
}

/**
 * Resolve the cities a plan is built around from composable intents (the single
 * source of truth for both the engine pool and the day estimator, so suggested
 * length always matches the cities actually planned):
 *  - no experiences → just the picked cities,
 *  - no picked cities → the experience champions,
 *  - both → user picks are always kept, and every selected experience is
 *    guaranteed a strong city. An experience already covered by a picked city
 *    (authored or signature, i.e. strength >= 2 — NOT a loose derived match)
 *    adds nothing; each uncovered experience contributes its champion.
 * This is the "honor cities AND experiences together" union, and the reason a
 * hand-picked city never wipes the vibe (and vice-versa). Returns [] when
 * nothing is scoped. Pure.
 */
export function resolvePlannedCities(
  rule: CountryRule,
  selectedCities: string[],
  selectedExperiences: string[],
): string[] {
  const picked = selectedCities.filter((n) => rule.cities[n]);
  if (selectedExperiences.length === 0) return picked;
  if (picked.length === 0) return topExperienceCities(rule, selectedExperiences);
  const uncovered = selectedExperiences.filter(
    (exp) => !picked.some((n) => cityExperienceStrength(rule, n, exp) >= 2),
  );
  if (uncovered.length === 0) return picked;
  const champions = experienceChampions(rule, uncovered).filter((n) => !picked.includes(n));
  return [...picked, ...champions];
}

/**
 * Recommended trip length (days) for the current Plan-tab selections. The scope
 * is the unified `resolvePlannedCities` set — picked cities together with a
 * champion city for every uncovered experience — so the estimate always matches
 * the cities the engine actually plans. When nothing is scoped, falls back to
 * the country's recommended length. The budget-tier factor
 * (premium longer, budget shorter) only applies once the user has actually
 * scoped the plan — a pristine, unscoped plan seeds to the recommended length so
 * it lines up with the static "Recommended" marker instead of silently diverging.
 * Clamped to [1, maxDays]. Pure and side-effect free so callers can re-seed
 * their day slider whenever any of these inputs change.
 */
export function recommendedDaysForSelection(opts: {
  rule: CountryRule | null | undefined;
  recDays: number;
  maxDays: number;
  selectedCities: string[];
  selectedExperiences: string[];
  budgetTier?: "budget" | "mid" | "premium";
}): number {
  const { rule, recDays, maxDays, selectedCities, selectedExperiences, budgetTier } = opts;
  const safeMax = Math.max(1, maxDays);
  const scoped = selectedCities.length > 0 || selectedExperiences.length > 0;

  let base: number;
  if (rule && scoped) {
    const planned = resolvePlannedCities(rule, selectedCities, selectedExperiences);
    const plannedDays = planned.reduce((s, n) => s + (rule.cities[n]?.recDays ?? 0), 0);
    base = plannedDays > 0 ? plannedDays : recDays;
  } else {
    base = recDays;
  }

  const factor = scoped && budgetTier ? BUDGET_DAY_FACTOR[budgetTier] : 1;
  return Math.min(safeMax, Math.max(1, Math.round(base * factor)));
}

/**
 * Build a ruled itinerary for a country, optionally biased toward the given
 * experiences. Experience matching is delegated to the shared cityExperiences
 * helpers so the engine and the panel UI stay consistent.
 */
function getRuledItinerary(
  country: Country,
  selectedCities: string[],
  customDays: number,
  rule: CountryRule | undefined,
  basis: BudgetBasis,
  selectedExperiences: string[] = [],
): TripPlan | null {
  const effectiveRule = rule;
  if (!effectiveRule) return null;

  const expTokens = experienceTokens(selectedExperiences);

  // Select cities and allocate days via optimal bounded-knapsack DP.
  // User-picked cities are all kept (allocation only); auto mode may drop cities
  // to best fit the day budget.
  const scored = scoreCities(effectiveRule);
  // Boost cities whose authored content matches the selected experiences so the
  // DP (auto mode) prefers experience-relevant cities. Explicitly picked cities
  // are always kept, so the boost only reshuffles which cities auto mode drops.
  const boosted =
    selectedExperiences.length > 0
      ? scored.map((c) => {
          const cr = effectiveRule.cities[c.name];
          const matched = cr.experiences ?? matchCityExperiences(ruleCityText(cr), selectedExperiences);
          const hits = matched.filter((e) => selectedExperiences.includes(e)).length;
          return hits > 0 ? { ...c, value: c.value * (1 + Math.min(0.6, 0.3 * hits)) } : c;
        })
      : scored;
  // Resolve the intended city set from the composable intents: picked cities are
  // always kept, and each uncovered experience contributes its champion (so
  // cities AND experiences are honored together). Empty → whole country (auto).
  const planned = resolvePlannedCities(effectiveRule, selectedCities, selectedExperiences);
  const pool = planned.length > 0 ? boosted.filter((c) => planned.includes(c.name)) : boosted;
  if (pool.length === 0) return null;

  // Force-keep every city when the user explicitly picked cities (allocate only);
  // an experience-only focus stays auto so the DP can drop the weaker champion to
  // fit a short day budget.
  const allocation = planItinerary(pool, customDays, {
    includeAll: selectedCities.length > 0,
  });
  if (allocation.length === 0) return null;

  const citiesToVisit = allocation.map((a) => a.name);
  const totalDays = allocation.reduce((s, a) => s + a.days, 0);

  // Build DayEntry array — one entry per calendar day
  const days: DayEntry[] = [];
  let dayIdx = 1;

  for (const a of allocation) {
    const city = effectiveRule.cities[a.name];
    for (let d = 0; d < a.days; d++) {
      const rulePlan = city.days[d] ?? city.days[city.days.length - 1];
      const dayNum = dayIdx + d;
      // Surface experience-matching activities first (stable), then cap at 5.
      const orderedActs =
        expTokens.length > 0
          ? rulePlan.activities
              .map((act, i) => ({ act, i, hits: tokenHits(`${act.name} ${act.tip ?? ""}`, expTokens) }))
              .sort((a, b) => b.hits - a.hits || a.i - b.i)
              .map((x) => x.act)
          : rulePlan.activities;
      days.push({
        label: `Day ${dayNum} — ${a.name}`,
        theme: rulePlan.theme,
        activities: orderedActs
          .slice(0, 5)
          .map((act) => (act.cost ? `${act.name} (${act.cost})` : act.name)),
        hotels: rulePlan.hotels?.slice(0, 2).map((h) => `${h.name} — ${h.budget}`),
      });
    }
    dayIdx += a.days;
  }

  // Cost — scaled from the selected party basis (falls back to country.budget)
  // by trip length relative to the recommended length. At the recommended length
  // the factor is 1, so the plan cost equals that basis's budget chip; longer or
  // shorter trips scale linearly from that single source.
  const basisBudget = budgetForBasis(country, basis);
  const [baseLow, baseHigh] = parseCostRange(basisBudget);
  const recBaseline = getRecRuleDays(effectiveRule) ?? totalDays;
  const scaleFactor = recBaseline > 0 ? Math.max(0.2, totalDays / recBaseline) : 1;
  const costLow = Math.round(baseLow * scaleFactor);
  const costHigh = Math.round(baseHigh * scaleFactor);

  // Warning if the requested days couldn't fit the chosen cities and the trip had
  // to be expanded to each city's minimum stay.
  const warning =
    totalDays > customDays
      ? `${customDays} day${customDays !== 1 ? "s" : ""} is tight for ${allocation.length} ${allocation.length !== 1 ? "cities" : "city"} — expanded to ${totalDays} days (minimum needed).`
      : undefined;

  // Note: key connections + practical tips
  const connParts: string[] = [];
  for (let i = 0; i < citiesToVisit.length - 1; i++) {
    const conn = effectiveRule.connections.find(
      (c) => c.from === citiesToVisit[i] && c.to === citiesToVisit[i + 1]
    );
    if (conn) {
      const from = citiesToVisit[i].split(" ")[0];
      const to = citiesToVisit[i + 1].split(" ")[0];
      connParts.push(`${from} → ${to}: ${conn.method}${conn.cost ? ` (${conn.cost})` : ""}`);
    }
  }
  const tips = [
    effectiveRule.sim ? `SIM: ${effectiveRule.sim}` : "",
    effectiveRule.apps?.length ? effectiveRule.apps.slice(0, 3).join(" · ") : "",
    effectiveRule.extras?.length ? `Extras: ${effectiveRule.extras.slice(0, 3).join(", ")}` : "",
  ].filter(Boolean);

  const note = [...connParts.slice(0, 3), ...tips].join(" | ");

  return {
    duration: `${totalDays} day${totalDays !== 1 ? "s" : ""}`,
    costPerPerson: costRange(costLow, costHigh),
    days,
    note,
    warning,
    costBasis: basis,
  };
}

/**
 * One unit's contribution to a composed multi-unit trip. `name` is the unit's
 * display name (a country today; a state/city for the future domestic scope) and
 * `plan` is that unit's own itinerary from {@link generateTripPlan}.
 */
export type TripSegment = { name: string; plan: TripPlan };

/**
 * Compose several single-unit itineraries into one multi-unit trip plan, in visit
 * order. Days are concatenated and **renumbered continuously** across the route
 * (via {@link shiftPlanDays}) so the composed plan reads Day 1..N end-to-end — the
 * share/PDF/context surfaces all consume this. `days.length` stays an honest total
 * day count (renumbering rewrites labels only). Costs sum across units and the
 * total duration is the summed day count.
 *
 * A single segment returns its plan unchanged, so the single-destination path is
 * byte-for-byte identical to today. Nothing here assumes "country" — the same
 * composition serves a future domestic route of cities/states.
 */
export function composeTripPlan(segments: TripSegment[], basis: BudgetBasis): TripPlan {
  if (segments.length === 1) return segments[0].plan;
  if (segments.length === 0) {
    return { duration: "0 days", costPerPerson: costRange(0, 0), days: [], note: "", costBasis: basis };
  }

  const days: DayEntry[] = [];
  const warnings: string[] = [];
  let low = 0;
  let high = 0;
  for (const seg of segments) {
    // Renumber each stop's days so the composed plan reads Day 1..N across the
    // whole route (share/PDF/context all consume this), not per-stop restarts.
    days.push(...shiftPlanDays(seg.plan.days, days.length));
    const parsed = parseBudgetRange(seg.plan.costPerPerson);
    if (parsed) {
      low += parsed[0];
      high += parsed[1];
    }
    if (seg.plan.warning) warnings.push(seg.plan.warning);
  }

  const route = segments.map((s) => s.name).join(" → ");
  return {
    duration: `${days.length} day${days.length !== 1 ? "s" : ""}`,
    costPerPerson: costRange(low, high),
    days,
    note: `A ${segments.length}-stop route: ${route}.`,
    warning: warnings.length > 0 ? warnings.join(" ") : undefined,
    costBasis: basis,
  };
}

export function generateTripPlan(
  country: Country,
  selectedCities: string[] = [],
  customDays = 7,
  externalRule?: CountryRule | null,
  basis: BudgetBasis = DEFAULT_BUDGET_BASIS,
  selectedExperiences: string[] = [],
): TripPlan {
  // Use explicit rule if provided
  const rule = externalRule;
  if (rule) {
    const ruled = getRuledItinerary(country, selectedCities, customDays, rule, basis, selectedExperiences);
    if (ruled) return ruled;
  }

  const exps = country.experiences;
  const [baseLow, baseHigh] = parseCostRange(budgetForBasis(country, basis));
  const landmark = country.landmark ?? exps[0] ?? country.name;
  const bestTime = country.bestMonths.slice(0, 3).join(", ");

  // ── Generic day-count fallback (no rule coverage) ──────────────────────────
  const scaleFactor = customDays / 10;
  const low = Math.round(baseLow * Math.max(0.3, scaleFactor));
  const high = Math.round(baseHigh * Math.max(0.4, scaleFactor));

  if (selectedCities.length === 0) {
    // No cities selected — generic day-count plan
    const weeks = Math.floor(customDays / 7);
    const remainder = customDays % 7;
    const dayChunks: DayEntry[] = [];

    if (weeks > 0) {
      dayChunks.push({
        label: `Day 1–${Math.min(7, customDays)} — Arrival & Core Highlights`,
        activities: [
          `Arrive, check in, first look at ${landmark}`,
          act(exps[0] ?? landmark),
          act(exps[1] ?? exps[0]),
        ],
      });
    }
    if (weeks > 1) {
      dayChunks.push({
        label: `Day 8–${Math.min(14, customDays)} — Deeper Exploration`,
        activities: exps.slice(2, 5).map(act),
      });
    }
    if (weeks > 2 || remainder > 0) {
      dayChunks.push({
        label: `Day ${customDays - Math.min(2, customDays - 1)}–${customDays} — Final Days`,
        activities: [
          exps.length > 5 ? act(exps[5]) : "Revisit your favourite spot",
          "Local food run and last-minute shopping",
          "Depart",
        ],
      });
    }
    if (dayChunks.length === 0) {
      dayChunks.push({
        label: `Day 1–${customDays} — Your Trip`,
        activities: [act(exps[0] ?? landmark), act(exps[1] ?? exps[0]), "Explore at your own pace"],
      });
    }

    return {
      duration: `${customDays} day${customDays !== 1 ? "s" : ""}`,
      costPerPerson: costRange(low, high),
      costBasis: basis,
      days: dayChunks,
      note: `Flexible custom itinerary. Best months: ${bestTime}.`,
    };
  }

  // Cities selected
  const minDays = selectedCities.length;
  const warning = customDays < minDays
    ? `${customDays} days is tight for ${selectedCities.length} cities — consider adding ${minDays - customDays} more day${minDays - customDays !== 1 ? "s" : ""} or dropping a city.`
    : undefined;

  return cityBasedPlan(country, selectedCities, Math.max(customDays, minDays), low, high, warning);
}
