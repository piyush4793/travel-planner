/**
 * Deep links into live transport-search tools for a from→to pair.
 *
 * We deliberately do NOT bake fares or durations into the app: prices and
 * schedules go stale within months, so the honest move is to hand off to tools
 * that are always current (Google Flights, Rome2Rio, Google Maps). This one
 * module owns every transit URL so both the cross-country {@link BorderHop} and
 * the intra-country itinerary separators stay consistent and maintenance-free.
 */
export type TransitLink = { label: string; hint: string; icon: string; url: string };

const q = (s: string) => encodeURIComponent(s);

const flights = (from: string, to: string): TransitLink => ({
  label: "Search flights",
  hint: "Google Flights",
  icon: "✈",
  url: `https://www.google.com/travel/flights?q=${q(`flights from ${from} to ${to}`)}`,
});

const rome2rio = (from: string, to: string): TransitLink => ({
  label: "Compare all routes",
  hint: "Rome2Rio · rail, bus, ferry, drive",
  icon: "🧭",
  url: `https://www.rome2rio.com/map/${q(from)}/${q(to)}`,
});

const directions = (from: string, to: string): TransitLink => ({
  label: "Directions",
  hint: "Google Maps",
  icon: "🗺",
  url: `https://www.google.com/maps/dir/?api=1&origin=${q(from)}&destination=${q(to)}`,
});

/** Cross-country hop: fares/routings are too dynamic to bake in and flights usually matter most. */
export function crossCountryLinks(from: string, to: string): TransitLink[] {
  return [flights(from, to), rome2rio(from, to), directions(from, to)];
}

/**
 * Intra-country city hop: an all-modes comparison + turn-by-turn directions.
 * Rome2Rio still surfaces flights for the occasional long domestic leg, so we
 * skip a dedicated flights link here to keep the itinerary separator uncluttered.
 */
export function intercityLinks(from: string, to: string): TransitLink[] {
  return [rome2rio(from, to), directions(from, to)];
}

/** Qualify a place with its country so search tools disambiguate (e.g. "Bergen, Norway"). */
export function qualifyPlace(place: string, country?: string): string {
  return country ? `${place}, ${country}` : place;
}
