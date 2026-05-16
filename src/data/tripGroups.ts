/**
 * Curated trip groups — every seed country assigned to exactly one trip.
 * Max 3 countries per trip. First country is the "main" destination.
 * Inspired by the "stack countries" concept for optimal travel combinations.
 */

export type Region = "Asia" | "Europe" | "Middle East" | "Africa" | "Americas" | "Oceania";

export type TripGroupDef = {
  main: string;
  addOns: string[];
  region: Region;
};

export const TRIP_GROUPS: TripGroupDef[] = [
  { main: "Vietnam", addOns: ["Cambodia", "Laos"], region: "Asia" },
  { main: "Thailand", addOns: ["Malaysia", "Singapore"], region: "Asia" },
  { main: "Japan", addOns: ["South Korea"], region: "Asia" },
  { main: "China", addOns: [], region: "Asia" },
  { main: "Indonesia", addOns: ["Philippines"], region: "Asia" },
  { main: "Nepal", addOns: ["Bhutan"], region: "Asia" },
  { main: "Maldives", addOns: [], region: "Asia" },
  { main: "Iceland", addOns: ["Greenland"], region: "Europe" },
  { main: "Norway", addOns: ["Denmark", "Scotland"], region: "Europe" },
  { main: "UK", addOns: ["Netherlands"], region: "Europe" },
  { main: "France", addOns: ["Spain"], region: "Europe" },
  { main: "Italy", addOns: ["Greece"], region: "Europe" },
  { main: "Germany", addOns: ["Austria", "Switzerland"], region: "Europe" },
  { main: "Czech Republic", addOns: ["Poland", "Hungary"], region: "Europe" },
  { main: "Romania", addOns: [], region: "Europe" },
  { main: "Turkey", addOns: ["Egypt", "Dubai"], region: "Middle East" },
  { main: "Georgia", addOns: ["Russia", "Belarus"], region: "Europe" },
  { main: "South Africa", addOns: [], region: "Africa" },
  { main: "Argentina", addOns: ["Antarctica"], region: "Americas" },
  { main: "Australia", addOns: ["New Zealand"], region: "Oceania" },
  { main: "Hawaii", addOns: [], region: "Oceania" },
];

export const ALL_REGIONS: Region[] = ["Asia", "Europe", "Middle East", "Africa", "Americas", "Oceania"];

/** Merge seed trip groups with user overrides + tombstones */
export function buildMergedTripGroups(
  customs: TripGroupDef[],
  deleted: string[],
  allCountryNames: string[],
): TripGroupDef[] {
  const deletedSet = new Set(deleted);
  const customByMain = new Map(customs.map((g) => [g.main, g]));
  const nameSet = new Set(allCountryNames);

  const merged: TripGroupDef[] = [];
  for (const seed of TRIP_GROUPS) {
    if (deletedSet.has(seed.main)) continue;
    const group = customByMain.get(seed.main) ?? seed;
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
