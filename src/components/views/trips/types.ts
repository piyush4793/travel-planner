import type { Country } from "../../../core/types";
import type { Region, TripGroupDef } from "../../../core/data/tripGroups";

export type Trip = {
  id: number;
  main: Country;
  addOns: Country[];
  allCountries: Country[];
  visitedCount: number;
  allVisited: boolean;
  noneVisited: boolean;
  isFavorited: boolean;
  region: Region;
  source: "group" | "solo";
  isCustom?: boolean;
};

export function buildTrips(
  allCountries: Country[],
  tripGroups: TripGroupDef[],
  visitedNames: Set<string>,
  favorites: Set<string>,
): Trip[] {
  const byName = new Map(allCountries.map((c) => [c.name, c]));
  const groupByMain = new Map(tripGroups.map((g) => [g.main, g]));
  const trips: Trip[] = [];
  let nextId = 0;

  for (const main of allCountries) {
    const group = groupByMain.get(main.name);
    const addOns = (group?.addOns ?? [])
      .map((n) => byName.get(n))
      .filter((c): c is Country => c !== undefined && c.name !== main.name);
    const all = [main];
    const vCount = visitedNames.has(main.name) ? 1 : 0;
    trips.push({
      id: nextId++,
      main,
      addOns,
      allCountries: all,
      visitedCount: vCount,
      allVisited: vCount === all.length,
      noneVisited: vCount === 0,
      isFavorited: all.some((c) => favorites.has(c.name)),
      region: (group?.region ?? (main.region as Region)) || "Asia",
      source: group ? "group" : "solo",
      isCustom: group?.isCustom,
    });
  }

  return trips;
}
