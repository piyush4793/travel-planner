import type { Country, CityEntry } from "../types";
import type { ConsolidatedCountry } from "../../data/consolidatedCountry";
import { matchCityExperiences, ruleCityText } from "./cityExperiences";

/**
 * Attach the country-level experiences each city satisfies. An authored
 * `experiences` array on the city wins; otherwise we derive from the city's
 * notes plus its itinerary content (day themes + activities) so the panel and
 * engine share one consistent mapping. Cities with no match are left untouched.
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
    travelStyle: data.travelStyle as Country["travelStyle"],
    cities: withCityExperiences(data.cities, data.experiences ?? [], data.itinerary),
    stopoverNote: data.stopoverNote ?? undefined,
    links: data.links,
  };
}

function hasItems<T>(v: T[] | undefined): v is T[] {
  return Array.isArray(v) && v.length > 0;
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
    travelStyle: base.travelStyle ?? rich.travelStyle,
    cities: hasItems(base.cities) ? base.cities : rich.cities,
    stopoverNote: base.stopoverNote ?? rich.stopoverNote,
    links: hasItems(base.links) ? base.links : rich.links,
  };
}
