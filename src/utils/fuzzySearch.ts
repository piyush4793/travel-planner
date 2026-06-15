import Fuse from "fuse.js";
import type { Country } from "../core/types";

// Fuzzy search helper for trips (generic type)
export type Searchable = {
  id: number;
  allCountries: Country[];
  main: Country;
};

// Create a searchable document from a trip for fuzzy matching
function createSearchDocument(trip: Searchable): {
  id: number;
  text: string;
  displayName: string;
} {
  const parts: string[] = [];

  for (const country of trip.allCountries) {
    // Country name
    parts.push(country.name);

    // Region
    if (country.region) parts.push(country.region);

    // Experiences
    if (country.experiences?.length) {
      parts.push(...country.experiences);
    }

    // Cities
    if (country.cities?.length) {
      parts.push(...country.cities.map((c) => c.name));
      if (country.cities.some((c) => c.notes)) {
        parts.push(...country.cities.map((c) => c.notes || "").filter(Boolean));
      }
    }

    // Landmark
    if (country.landmark) parts.push(country.landmark);

    // Travel style
    if (country.travelStyle?.length) {
      parts.push(...country.travelStyle);
    }

    // Stopover note
    if (country.stopoverNote) parts.push(country.stopoverNote);

    // Avoid/watch out for
    if (country.avoid?.length) parts.push(...country.avoid);

    // Combo destinations
    if (country.combo?.length) parts.push(...country.combo);

    // Notes
    if (country.notes) parts.push(country.notes);
  }

  return {
    id: trip.id,
    text: parts.join(" ").toLowerCase(),
    displayName: trip.main.name,
  };
}

// Fuzzy search trips by any attribute
export function fuzzySearchTrips<T extends Searchable>(trips: T[], query: string): T[] {
  if (!query.trim()) return trips;

  const documents = trips.map(createSearchDocument);

  const fuse = new Fuse(documents, {
    keys: ["text"],
    includeScore: true,
    minMatchCharLength: 1,
    threshold: 0.4, // Allow ~40% character mismatch (fuzzy)
    useExtendedSearch: true,
    shouldSort: true,
  });

  const results = fuse.search(query);
  const resultIds = new Set(results.map((r) => r.item.id));
  return trips.filter((t) => resultIds.has(t.id));
}
