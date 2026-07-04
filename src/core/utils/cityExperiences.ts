import type { CityRule } from "../data/itineraryRules";

/**
 * Single source of truth for mapping free-form experience labels onto the
 * authored content of a city. Both the itinerary engine (day/city scoring) and
 * the country panel UI (city highlighting) derive their matches from here, so
 * the heuristics stay consistent and testable in one place.
 */

/**
 * Reduce free-form experience labels to lowercase, singularised keyword tokens
 * (≥4 chars) for loose matching against rule text. E.g. "Street Food" →
 * ["street", "food"], "Temples" → ["temple"].
 */
export function experienceTokens(experiences: string[]): string[] {
  const toks = new Set<string>();
  for (const e of experiences) {
    for (const w of e.toLowerCase().split(/[^a-z]+/)) {
      if (w.length >= 4) toks.add(w.replace(/s$/, ""));
    }
  }
  return [...toks];
}

/** Count how many of the given tokens appear anywhere in `text`. */
export function tokenHits(text: string, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  const t = text.toLowerCase();
  let hits = 0;
  for (const tok of tokens) if (t.includes(tok)) hits++;
  return hits;
}

/** Flatten a city's authored rule content into a single searchable string. */
export function ruleCityText(city: CityRule): string {
  return [
    city.name,
    city.note ?? "",
    ...city.days.map((d) => `${d.theme} ${d.activities.map((a) => a.name).join(" ")}`),
  ].join(" ");
}

/**
 * Return the subset of `candidates` (country-level experience labels) whose
 * keyword tokens appear in `text`. Used both to derive per-city experience tags
 * at enrichment time and to score experience relevance in the engine.
 */
export function matchCityExperiences(text: string, candidates: string[]): string[] {
  const t = text.toLowerCase();
  return candidates.filter((exp) => experienceTokens([exp]).some((tok) => t.includes(tok)));
}
