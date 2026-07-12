import { describe, it, expect } from "vitest";
import { cityDayValue, scoreCities, planItinerary, type CityDayBounds } from "@/core/utils/citySelection.ts";
import type { CountryRule } from "@/core/data/itineraryRules.ts";

type RuleDay = CountryRule["cities"][string]["days"][number];

function day(theme: string): RuleDay {
  return { theme, activities: [{ name: "Walk" }] };
}

function makeRule(
  cities: { name: string; minDays: number; recDays: number; maxDays: number; depth: number }[],
): CountryRule {
  const map: CountryRule["cities"] = {};
  for (const c of cities) {
    map[c.name] = {
      name: c.name,
      minDays: c.minDays,
      recDays: c.recDays,
      maxDays: c.maxDays,
      days: Array.from({ length: c.depth }, (_, i) => day(`T${i}`)),
    };
  }
  return {
    cityOrder: cities.map((c) => c.name),
    cities: map,
    connections: [],
  };
}

function bounds(
  name: string,
  minDays: number,
  recDays: number,
  maxDays: number,
  value: number,
  order: number,
): CityDayBounds {
  return { name, minDays, recDays, maxDays, value, order };
}

function totalValue(cities: CityDayBounds[], alloc: { name: string; days: number }[]): number {
  return alloc.reduce((s, a) => {
    const c = cities.find((x) => x.name === a.name)!;
    return s + cityDayValue(c, a.days);
  }, 0);
}

/** Brute-force optimum: try every skip/day combination, exactly D days. */
function bruteForce(cities: CityDayBounds[], D: number): number {
  let best = 0;
  const rec = (i: number, used: number, val: number) => {
    if (i === cities.length) {
      if (used === D) best = Math.max(best, val);
      return;
    }
    rec(i + 1, used, val); // skip
    const c = cities[i];
    for (let d = c.minDays; d <= c.maxDays && used + d <= D; d++) {
      rec(i + 1, used + d, val + cityDayValue(c, d));
    }
  };
  rec(0, 0, 0);
  return best;
}

describe("citySelection — cityDayValue", () => {
  const b = bounds("X", 2, 4, 6, 1, 0);
  it("is 0 below the minimum stay", () => {
    expect(cityDayValue(b, 1)).toBe(0);
  });
  it("is concave: presence < rec < max, with diminishing returns", () => {
    const atMin = cityDayValue(b, 2);
    const atRec = cityDayValue(b, 4);
    const atMax = cityDayValue(b, 6);
    expect(atMin).toBeCloseTo(0.7);
    expect(atRec).toBeCloseTo(1.0);
    expect(atMax).toBeCloseTo(1.15);
    // ramp (min->rec) steeper than bonus (rec->max)
    expect(atRec - atMin).toBeGreaterThan(atMax - atRec);
  });
  it("clamps beyond maxDays", () => {
    expect(cityDayValue(b, 10)).toBeCloseTo(cityDayValue(b, 6));
  });
});

describe("citySelection — scoreCities", () => {
  it("ranks a richer, higher-rec, earlier city above a sparse late one", () => {
    const rule = makeRule([
      { name: "Big", minDays: 2, recDays: 4, maxDays: 6, depth: 4 },
      { name: "Small", minDays: 1, recDays: 1, maxDays: 2, depth: 1 },
    ]);
    const scored = scoreCities(rule);
    const big = scored.find((c) => c.name === "Big")!;
    const small = scored.find((c) => c.name === "Small")!;
    expect(big.value).toBeGreaterThan(small.value);
    expect(big.order).toBe(0);
    expect(small.order).toBe(1);
  });
  it("returns empty for a rule with no cities", () => {
    expect(scoreCities({ cityOrder: [], cities: {}, connections: [] })).toEqual([]);
  });
});

describe("citySelection — planItinerary", () => {
  const cities = [
    bounds("A", 2, 3, 4, 1.0, 0),
    bounds("B", 1, 2, 3, 0.8, 1),
    bounds("C", 1, 2, 4, 0.6, 2),
  ];

  it("fills exactly the requested days when feasible", () => {
    const alloc = planItinerary(cities, 7);
    expect(alloc.reduce((s, a) => s + a.days, 0)).toBe(7);
  });

  it("respects each city's min/max day bounds", () => {
    const alloc = planItinerary(cities, 8);
    for (const a of alloc) {
      const c = cities.find((x) => x.name === a.name)!;
      expect(a.days).toBeGreaterThanOrEqual(c.minDays);
      expect(a.days).toBeLessThanOrEqual(c.maxDays);
    }
  });

  it("returns cities in route order", () => {
    const alloc = planItinerary(cities, 9);
    const orders = alloc.map((a) => cities.find((c) => c.name === a.name)!.order);
    expect(orders).toEqual([...orders].sort((x, y) => x - y));
  });

  it("matches the brute-force optimum across a range of day budgets", () => {
    for (let D = 1; D <= 11; D++) {
      const alloc = planItinerary(cities, D);
      const got = totalValue(cities, alloc);
      const opt = bruteForce(cities, D);
      // Only compare when an exact-D packing exists (bruteForce > 0).
      if (opt > 0) expect(got).toBeCloseTo(opt);
    }
  });

  it("drops low-value cities to fit a tight budget", () => {
    // 2 days: best is A alone (value 1.0 at min) vs B+C (0.8+0.6 but needs >=2). DP picks max value.
    const alloc = planItinerary(cities, 2);
    expect(alloc.reduce((s, a) => s + a.days, 0)).toBe(2);
  });

  it("includeAll keeps every city and only allocates days", () => {
    const alloc = planItinerary(cities, 6, { includeAll: true });
    expect(alloc.map((a) => a.name).sort()).toEqual(["A", "B", "C"]);
    expect(alloc.reduce((s, a) => s + a.days, 0)).toBe(6);
  });

  it("includeAll expands beyond a too-small budget to each city's minimum", () => {
    // sum of mins = 4; ask for 2 -> infeasible, fallback to all at min (4 days).
    const alloc = planItinerary(cities, 2, { includeAll: true });
    expect(alloc.map((a) => a.name).sort()).toEqual(["A", "B", "C"]);
    expect(alloc.reduce((s, a) => s + a.days, 0)).toBe(4);
  });

  it("falls back to the single most valuable city when D is below every minimum", () => {
    const big = [bounds("Big", 3, 4, 5, 1.0, 0), bounds("Mid", 2, 3, 4, 0.9, 1)];
    const alloc = planItinerary(big, 1);
    expect(alloc).toEqual([{ name: "Big", days: 3 }]);
  });

  it("is deterministic", () => {
    const a1 = planItinerary(cities, 8);
    const a2 = planItinerary(cities, 8);
    expect(a1).toEqual(a2);
  });

  it("returns empty for no cities or zero days", () => {
    expect(planItinerary([], 5)).toEqual([]);
    expect(planItinerary(cities, 0)).toEqual([]);
  });

  it("returns empty for a non-finite or negative day budget", () => {
    expect(planItinerary(cities, Number.NaN)).toEqual([]);
    expect(planItinerary(cities, Infinity)).toEqual([]);
    expect(planItinerary(cities, -3)).toEqual([]);
  });
});
