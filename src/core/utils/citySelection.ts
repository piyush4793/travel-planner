import type { CountryRule } from "../data/itineraryRules";

/**
 * City itinerary selection & day allocation.
 *
 * Problem: given a trip of `totalDays`, pick which cities to visit and how many
 * days to give each so total travel value is maximised, subject to every chosen
 * city getting between its `minDays` and `maxDays`. This is a bounded-knapsack /
 * resource-allocation problem solved optimally with dynamic programming.
 *
 * Value model (data-driven): each city has a base importance `value` derived from
 * real rule signals (recommended days, authored content depth, route prominence),
 * combined with a concave per-day satisfaction curve — being present matters most,
 * reaching the recommended stay completes the experience, and extra days give
 * diminishing returns. The DP therefore prefers spreading days across more
 * worthwhile cities over over-stuffing a single one, while still filling the trip.
 */

export type CityDayBounds = {
  name: string;
  minDays: number;
  recDays: number;
  maxDays: number;
  /** Relative importance (higher = more worth visiting). Scale is arbitrary. */
  value: number;
  /** Route-order index — used only to keep output in travel order. */
  order: number;
};

export type CityAllocation = { name: string; days: number };

/**
 * Concave value of spending `days` in a city. Returns 0 below `minDays`.
 * f(min)=0.7·value, f(rec)=1.0·value, f(max)=1.15·value — presence dominates,
 * recommended stay completes it, extra days add diminishing exploration value.
 */
export function cityDayValue(b: CityDayBounds, days: number): number {
  if (days < b.minDays) return 0;
  const d = Math.min(days, b.maxDays);
  const presence = 0.7;
  const ramp =
    b.recDays > b.minDays
      ? 0.3 * (Math.min(d, b.recDays) - b.minDays) / (b.recDays - b.minDays)
      : d >= b.recDays
        ? 0.3
        : 0;
  const bonus =
    d > b.recDays && b.maxDays > b.recDays
      ? 0.15 * (d - b.recDays) / (b.maxDays - b.recDays)
      : 0;
  return b.value * (presence + ramp + bonus);
}

/**
 * Derive per-city bounds + importance from a country's rule data.
 * Importance blends recommended days (0.5), authored content depth (0.3), and
 * route prominence (0.2) — a proxy for popularity, since the rule set has no
 * explicit per-city popularity metric. Swap in a real metric here if one exists.
 */
export function scoreCities(rule: CountryRule): CityDayBounds[] {
  const names = rule.cityOrder.filter((c) => rule.cities[c]);
  if (names.length === 0) return [];
  const cityRules = names.map((c) => rule.cities[c]);
  const maxRec = Math.max(1, ...cityRules.map((c) => c.recDays));
  const maxDepth = Math.max(1, ...cityRules.map((c) => c.days.length));
  const n = names.length;

  return names.map((name, i) => {
    const c = rule.cities[name];
    const recN = c.recDays / maxRec;
    const depthN = c.days.length / maxDepth;
    const orderN = n > 1 ? 1 - i / (n - 1) : 1;
    const value = 0.5 * recN + 0.3 * depthN + 0.2 * orderN;
    return { name, minDays: c.minDays, recDays: c.recDays, maxDays: c.maxDays, value, order: i };
  });
}

const NEG = -Infinity;

/**
 * Optimally select cities and allocate `totalDays` among them to maximise total
 * value. When `includeAll` is true every city must be included (used when the
 * user hand-picks cities — allocation only); otherwise cities may be skipped.
 *
 * Guarantees an exactly `totalDays`-long trip when feasible; if the day budget is
 * below every city's minimum, returns the single most valuable city at its minimum
 * so callers always get a usable itinerary. Complexity O(n · D · R) where R is the
 * per-city day range — tiny for real data (n≈4–8, D≤~40).
 */
export function planItinerary(
  cities: CityDayBounds[],
  totalDays: number,
  opts: { includeAll?: boolean } = {},
): CityAllocation[] {
  const n = cities.length;
  const D = Math.max(0, Math.floor(totalDays));
  if (n === 0 || D === 0) return [];

  // dp[t] = best value using processed cities with exactly t days (NEG = unreachable).
  let dp = new Float64Array(D + 1).fill(NEG);
  dp[0] = 0;
  // choice[i][t] = days assigned to city i to arrive at state t (0 = skipped).
  const choice: Int32Array[] = [];

  for (let i = 0; i < n; i++) {
    const c = cities[i];
    const next = new Float64Array(D + 1).fill(NEG);
    const ch = new Int32Array(D + 1).fill(-1);
    for (let t = 0; t <= D; t++) {
      if (dp[t] === NEG) continue;
      // Option 1: skip this city (only when inclusion isn't mandatory).
      if (!opts.includeAll && dp[t] > next[t]) {
        next[t] = dp[t];
        ch[t] = 0;
      }
      // Option 2: include with d days, d in [minDays, maxDays], not overflowing D.
      const maxD = Math.min(c.maxDays, D - t);
      for (let d = c.minDays; d <= maxD; d++) {
        const v = dp[t] + cityDayValue(c, d);
        const nt = t + d;
        if (v > next[nt]) {
          next[nt] = v;
          ch[nt] = d;
        }
      }
    }
    dp = next;
    choice.push(ch);
  }

  // Prefer an exactly full trip; otherwise the fullest reachable trip.
  let bestT = -1;
  if (dp[D] > NEG) {
    bestT = D;
  } else {
    for (let t = D; t >= 1; t--) {
      if (dp[t] > NEG) {
        bestT = t;
        break;
      }
    }
  }

  const alloc = bestT > 0 ? reconstruct(cities, choice, bestT) : [];
  if (alloc.length > 0) {
    alloc.sort((a, b) => orderOf(cities, a.name) - orderOf(cities, b.name));
    return alloc;
  }

  // Day budget below every city's minimum — return the single best city at its min
  // (or, when forced to include all, every city at its minimum).
  return fallback(cities, opts.includeAll ?? false);
}

function reconstruct(
  cities: CityDayBounds[],
  choice: Int32Array[],
  target: number,
): CityAllocation[] {
  const alloc: CityAllocation[] = [];
  let t = target;
  for (let i = cities.length - 1; i >= 0; i--) {
    const d = choice[i][t];
    if (d > 0) {
      alloc.push({ name: cities[i].name, days: d });
      t -= d;
    }
  }
  return alloc;
}

function fallback(cities: CityDayBounds[], includeAll: boolean): CityAllocation[] {
  if (cities.length === 0) return [];
  if (includeAll) {
    return [...cities]
      .sort((a, b) => a.order - b.order)
      .map((c) => ({ name: c.name, days: c.minDays }));
  }
  const top = cities.reduce((best, c) => (c.value > best.value ? c : best), cities[0]);
  return [{ name: top.name, days: top.minDays }];
}

function orderOf(cities: CityDayBounds[], name: string): number {
  const c = cities.find((x) => x.name === name);
  return c ? c.order : 0;
}
