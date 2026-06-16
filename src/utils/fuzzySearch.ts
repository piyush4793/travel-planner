import Fuse from "fuse.js";
import type { Country } from "../core/types";

// Fuzzy search helper for trips (generic type)
export type Searchable = {
  id: number;
  allCountries: Country[];
  main: Country;
};

// Create a searchable document from a trip for matching/ranking
function createSearchDocument(trip: Searchable): {
  id: number;
  mainName: string;
  countryNames: string[];
  regions: string[];
  cities: string[];
  experiences: string[];
  extras: string[];
  text: string;
} {
  const countries: string[] = [];
  const regions: string[] = [];
  const cities: string[] = [];
  const experiences: string[] = [];
  const extras: string[] = [];

  for (const country of trip.allCountries) {
    countries.push(normalizeKey(country.name));

    if (country.region) regions.push(normalizeKey(country.region));

    if (country.experiences?.length) {
      experiences.push(...country.experiences.map(normalizeKey));
    }

    if (country.cities?.length) {
      cities.push(...country.cities.map((c) => normalizeKey(c.name)));
      if (country.cities.some((c) => c.notes)) {
        extras.push(...country.cities.map((c) => c.notes || "").filter(Boolean).map(normalizeKey));
      }
    }

    if (country.landmark) extras.push(normalizeKey(country.landmark));

    if (country.travelStyle?.length) {
      extras.push(...country.travelStyle.map(normalizeKey));
    }

    if (country.stopoverNote) extras.push(normalizeKey(country.stopoverNote));

    if (country.avoid?.length) extras.push(...country.avoid.map(normalizeKey));

    if (country.combo?.length) extras.push(...country.combo.map(normalizeKey));

    if (country.notes) extras.push(normalizeKey(country.notes));
  }

  const mainName = normalizeKey(trip.main.name);
  return {
    id: trip.id,
    mainName,
    countryNames: countries,
    regions,
    cities,
    experiences,
    extras,
    text: [mainName, ...countries, ...regions, ...cities, ...experiences, ...extras].join(" "),
  };
}

// Fuzzy search trips by any attribute
export function fuzzySearchTrips<T extends Searchable>(trips: T[], query: string): T[] {
  const q = normalizeKey(query);
  if (!q) return trips;

  const documents = trips.map(createSearchDocument);
  const tripById = new Map(trips.map((trip) => [trip.id, trip]));

  const buckets: T[][] = [[], [], [], [], [], [], []];

  for (const doc of documents) {
    const trip = tripById.get(doc.id);
    if (!trip) continue;

    const mainPrefix = doc.mainName.startsWith(q);
    const mainWordPrefix = hasWordPrefix(doc.mainName, q);
    const countryPrefix = doc.countryNames.some((name) => name.startsWith(q));
    const mainContains = doc.mainName.includes(q);
    const countryContains = doc.countryNames.some((name) => name.includes(q));
    const cityPrefix = doc.cities.some((city) => city.startsWith(q));
    const relatedContains =
      doc.cities.some((city) => city.includes(q)) ||
      doc.regions.some((region) => region.includes(q)) ||
      doc.experiences.some((experience) => experience.includes(q)) ||
      doc.extras.some((extra) => extra.includes(q)) ||
      doc.text.includes(q);

    let bucketIndex = -1;
    if (mainPrefix) bucketIndex = 0;
    else if (mainWordPrefix) bucketIndex = 1;
    else if (countryPrefix) bucketIndex = 2;
    else if (mainContains) bucketIndex = 3;
    else if (countryContains) bucketIndex = 4;
    else if (cityPrefix) bucketIndex = 5;
    else if (relatedContains) bucketIndex = 6;

    if (bucketIndex >= 0) {
      buckets[bucketIndex].push(trip);
    }
  }

  const deterministic = buckets.flat();
  if (deterministic.length > 0) return deterministic;

  const fuse = new Fuse(documents, {
    keys: [
      { name: "mainName", weight: 0.5 },
      { name: "countryNames", weight: 0.25 },
      { name: "cities", weight: 0.15 },
      { name: "text", weight: 0.1 },
    ],
    includeScore: true,
    minMatchCharLength: 2,
    threshold: 0.3,
    ignoreLocation: true,
    shouldSort: true,
  });

  const fuzzyResults = fuse.search(q);
  const seen = new Set<number>();
  const ranked: T[] = [];
  for (const result of fuzzyResults) {
    const trip = tripById.get(result.item.id);
    if (!trip || seen.has(trip.id)) continue;
    seen.add(trip.id);
    ranked.push(trip);
  }
  return ranked;
}

function normalizeKey(value: string): string {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function hasWordPrefix(text: string, query: string): boolean {
  return text.split(" ").some((word) => word.startsWith(query));
}
