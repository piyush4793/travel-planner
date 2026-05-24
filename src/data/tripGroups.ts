/**
 * Curated trip groups — every seed country assigned to exactly one trip.
 * addOns are derived at runtime from the country's `combo` field in
 * countries.json (single source of truth). Seed only defines main + region.
 *
 * User-edited groups (tp_trip_customs) store full TripGroupDef with addOns.
 */

export type Region = "Asia" | "Europe" | "Middle East" | "Africa" | "Americas" | "Oceania";

export type TripGroupDef = {
  main: string;
  addOns: string[];
  region: Region;
};

type TripGroupSeed = { main: string; region: Region };

const TRIP_GROUP_SEEDS: TripGroupSeed[] = [
  // Southeast Asia
  { main: "Vietnam", region: "Asia" },
  { main: "Thailand", region: "Asia" },
  { main: "Cambodia", region: "Asia" },
  // East Asia
  { main: "Japan", region: "Asia" },
  { main: "China", region: "Asia" },
  // South & Southeast Islands
  { main: "Indonesia", region: "Asia" },
  { main: "Nepal", region: "Asia" },
  { main: "Maldives", region: "Asia" },
  // Scandinavia
  { main: "Norway", region: "Europe" },
  { main: "Iceland", region: "Europe" },
  // Western Europe
  { main: "UK", region: "Europe" },
  { main: "France", region: "Europe" },
  { main: "Italy", region: "Europe" },
  { main: "Germany", region: "Europe" },
  // Central/Eastern Europe
  { main: "Czech Republic", region: "Europe" },
  { main: "Romania", region: "Europe" },
  // Middle East & Caucasus
  { main: "Turkey", region: "Middle East" },
  { main: "Egypt", region: "Middle East" },
  { main: "United Arab Emirates", region: "Middle East" },
  // Africa
  { main: "South Africa", region: "Africa" },
  // Americas
  { main: "Argentina", region: "Americas" },
  { main: "United States", region: "Americas" },
  // Oceania
  { main: "Australia", region: "Oceania" },
];

/** Resolve seed → TripGroupDef by deriving addOns from combo data */
function resolveSeed(seed: TripGroupSeed, comboMap: Map<string, string[]>, myListNames: Set<string>): TripGroupDef {
  const combo = comboMap.get(seed.main) ?? [];
  // Pick first 2 combo countries that are in the user's My List
  const addOns = combo.filter((c) => myListNames.has(c)).slice(0, 2);
  return { main: seed.main, addOns, region: seed.region };
}

export const ALL_REGIONS: Region[] = ["Asia", "Europe", "Middle East", "Africa", "Americas", "Oceania"];

/** Merge seed trip groups with user overrides + tombstones */
export function buildMergedTripGroups(
  customs: TripGroupDef[],
  deleted: string[],
  allCountryNames: string[],
  comboMap: Map<string, string[]>,
): TripGroupDef[] {
  const deletedSet = new Set(deleted);
  const customByMain = new Map(customs.map((g) => [g.main, g]));
  const nameSet = new Set(allCountryNames);

  const merged: TripGroupDef[] = [];
  for (const seed of TRIP_GROUP_SEEDS) {
    if (deletedSet.has(seed.main)) continue;
    // User override takes priority; otherwise derive from combo
    const group = customByMain.get(seed.main) ?? resolveSeed(seed, comboMap, nameSet);
    customByMain.delete(seed.main);
    merged.push(sanitizeGroup(group, nameSet));
  }

  // User-created groups (main not in seed)
  for (const custom of customByMain.values()) {
    if (deletedSet.has(custom.main)) continue;
    merged.push(sanitizeGroup(custom, nameSet));
  }

  return merged;
}

function sanitizeGroup(g: TripGroupDef, validNames: Set<string>): TripGroupDef {
  const addOns = g.addOns
    .filter((n) => validNames.has(n) && n !== g.main)
    .filter((n, i, arr) => arr.indexOf(n) === i)
    .slice(0, 2);
  const region = ALL_REGIONS.includes(g.region) ? g.region : "Asia";
  return { main: g.main, addOns, region };
}
