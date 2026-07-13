import type { Country, CityEntry } from "../types";
import type { ConsolidatedCountry } from "../../data/consolidatedCountry";
import { matchCityExperiences, ruleCityText } from "./cityExperiences";

/**
 * Attach the country-level experiences each city satisfies. Precedence:
 *  1. an authored `experiences` array on the display city (rare hand-overrides),
 *  2. an authored `experiences` array on the matching itinerary city (`CityRule`)
 *     — the single source of truth shared with the engine,
 *  3. otherwise derive from the city's notes + itinerary content (keyword match).
 * Cities with no match are left untouched.
 */
function withCityExperiences(
  cities: ConsolidatedCountry["cities"],
  countryExperiences: string[],
  itinerary: ConsolidatedCountry["itinerary"],
): CityEntry[] {
  if (!Array.isArray(cities)) return cities;
  return cities.map((c) => {
    if (Array.isArray(c.experiences) && c.experiences.length > 0) return c;
    if (countryExperiences.length === 0) return c;
    const ruleCity = itinerary?.cities[c.name];
    if (ruleCity && Array.isArray(ruleCity.experiences) && ruleCity.experiences.length > 0) {
      return { ...c, experiences: ruleCity.experiences };
    }
    const text = `${c.notes ?? ""} ${ruleCity ? ruleCityText(ruleCity) : ""}`;
    const matched = matchCityExperiences(text, countryExperiences);
    return matched.length > 0 ? { ...c, experiences: matched } : c;
  });
}

/** Convert a loaded consolidated rule record into a full Country object. */
export function consolidatedToCountry(
  data: ConsolidatedCountry,
  popularityScore?: number,
): Country {
  const budget = typeof data.budget === "object" ? data.budget.couple : data.budget;
  return {
    name: data.name,
    lat: data.lat,
    lng: data.lng,
    region: data.region,
    popularityScore,
    bestMonths: data.bestMonths,
    worstMonths: data.worstMonths,
    budget,
    budgetBreakdown: typeof data.budget === "object" ? data.budget : undefined,
    experiences: data.experiences,
    avoid: data.avoid,
    combo: data.combo,
    landmark: data.landmark ?? undefined,
    cities: withCityExperiences(data.cities, data.experiences ?? [], data.itinerary),
    stopoverNote: data.stopoverNote ?? undefined,
    links: data.links,
    diet: data.diet,
  };
}

function hasItems<T>(v: T[] | undefined): v is T[] {
  return Array.isArray(v) && v.length > 0;
}

/**
 * Merge freshly-enriched rule fields onto user-authored cities. Cities are
 * matched by normalised name; for each match, seasonality/experience fields the
 * user left empty are backfilled from the rule while any authored value wins.
 * User-only cities (absent from the rule) and city order are preserved.
 *
 * Without this, a country edited before these fields existed would keep its
 * stale cities forever, since `mergeCountryData` otherwise treats `cities` as
 * all-or-nothing and discards the enriched copy whenever the base has any.
 */
function mergeCities(base: CityEntry[], rich: CityEntry[] | undefined): CityEntry[] {
  if (!hasItems(rich)) return base;
  const byName = new Map(rich.map((c) => [c.name.trim().toLowerCase(), c]));
  return base.map((c) => {
    const r = byName.get(c.name.trim().toLowerCase());
    if (!r) return c;
    return {
      ...c,
      bestMonths: hasItems(c.bestMonths) ? c.bestMonths : r.bestMonths,
      worstMonths: hasItems(c.worstMonths) ? c.worstMonths : r.worstMonths,
      experiences: hasItems(c.experiences) ? c.experiences : r.experiences,
    };
  });
}

/**
 * Overlay loaded rule data onto a (possibly minimal) Country, filling only the
 * fields the base is missing. User-authored values on the base always win, so
 * this safely hydrates catalog stubs and combine-with targets without clobbering
 * edits. Returns the base unchanged when no rule data is available.
 */
export function mergeCountryData(base: Country, data: ConsolidatedCountry | null): Country {
  if (!data) return base;
  const rich = consolidatedToCountry(data, base.popularityScore);
  return {
    ...base,
    region: base.region ?? rich.region,
    bestMonths: hasItems(base.bestMonths) ? base.bestMonths : rich.bestMonths,
    worstMonths: hasItems(base.worstMonths) ? base.worstMonths : rich.worstMonths,
    budget: base.budget || rich.budget,
    budgetBreakdown: base.budgetBreakdown ?? rich.budgetBreakdown,
    experiences: hasItems(base.experiences) ? base.experiences : rich.experiences,
    avoid: hasItems(base.avoid) ? base.avoid : rich.avoid,
    combo: hasItems(base.combo) ? base.combo : rich.combo,
    landmark: base.landmark ?? rich.landmark,
    cities: hasItems(base.cities) ? mergeCities(base.cities, rich.cities) : rich.cities,
    stopoverNote: base.stopoverNote ?? rich.stopoverNote,
    links: hasItems(base.links) ? base.links : rich.links,
    diet: base.diet ?? rich.diet,
  };
}
