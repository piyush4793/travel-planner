import type { Country } from "../types";
import { abbrevMonth } from "./months";

export type MonthFit = "best" | "avoid" | "neutral";

/**
 * How well a destination suits a given travel month.
 *  - "best"    → the month falls inside the destination's ideal window
 *  - "avoid"   → the month falls inside its avoid window (you can still go, warned)
 *  - "neutral" → neither list mentions the month (incl. destinations with no data)
 * Month tokens are compared abbreviation-wise so "July"/"Jul" both match.
 */
export function monthFit(country: Pick<Country, "bestMonths" | "worstMonths">, month: string): MonthFit {
  const target = abbrevMonth(month);
  const hits = (list: string[] | undefined) => (list ?? []).some((m) => abbrevMonth(m) === target);
  if (hits(country.bestMonths)) return "best";
  if (hits(country.worstMonths)) return "avoid";
  return "neutral";
}

const FIT_RANK: Record<MonthFit, number> = { best: 0, neutral: 1, avoid: 2 };

/**
 * Re-rank a popularity-ordered list by month fit for the chosen month, keeping
 * the incoming (popularity) order stable within each fit tier: best-window
 * destinations first, then neutral, then avoid-window ones last (never hidden).
 * A `null`/empty month returns the list unchanged so callers can pass it through
 * unconditionally.
 */
export function rankByMonthFit<T extends Pick<Country, "bestMonths" | "worstMonths">>(
  list: T[],
  month: string | null,
): T[] {
  if (!month) return list;
  return list
    .map((c, i) => ({ c, i, rank: FIT_RANK[monthFit(c, month)] }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map((x) => x.c);
}
