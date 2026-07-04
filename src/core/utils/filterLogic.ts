import type { Country, VisitedFilter } from "../types";
import { expandMonth } from "./months";
import { budgetForBasis, parseBudgetRange, DEFAULT_BUDGET_BASIS, type BudgetBasis } from "./budget";

export type { BudgetBasis } from "./budget";

export function filterByMonth(countries: Country[], months: string[]): Country[] {
  if (months.length === 0) return countries;
  const fulls = months.map(expandMonth);
  return countries.filter((c) =>
    fulls.some((full) => c.bestMonths.some((m) => m === full || m.startsWith(full.slice(0, 3))))
  );
}

export function filterByExperiences(countries: Country[], tags: string[]): Country[] {
  if (tags.length === 0) return countries;
  return countries.filter((c) => tags.every((tag) => c.experiences.includes(tag)));
}

export function filterByVisited(
  countries: Country[],
  visited: Set<string>,
  show: VisitedFilter
): Country[] {
  if (show === "visited") return countries.filter((c) => visited.has(c.name));
  if (show === "unvisited") return countries.filter((c) => !visited.has(c.name));
  return countries;
}

export type BudgetTier = "all" | "budget" | "mid" | "premium";

/**
 * Classify a budget range into a spend tier using the range **midpoint** — a
 * fairer representative of the trip's typical cost than the lower bound alone
 * (e.g. "₹1.5L–₹3L" averages ₹2.25L → mid, not budget). Unparseable strings fall
 * back to the cheapest tier so filtering stays inclusive.
 */
export function getBudgetTier(budget: string): "budget" | "mid" | "premium" {
  const range = parseBudgetRange(budget);
  const midpoint = range ? (range[0] + range[1]) / 2 : 0;
  if (midpoint <= 150000) return "budget";
  if (midpoint <= 300000) return "mid";
  return "premium";
}

export function filterByBudget(countries: Country[], tier: BudgetTier, basis: BudgetBasis = DEFAULT_BUDGET_BASIS): Country[] {
  if (tier === "all") return countries;
  return countries.filter((c) => getBudgetTier(budgetForBasis(c, basis)) === tier);
}

export function applyFilters(
  countries: Country[],
  month: string[],
  experiences: string[],
  visited: Set<string>,
  visitedFilter: VisitedFilter,
  budget: BudgetTier,
  budgetBasis: BudgetBasis = DEFAULT_BUDGET_BASIS,
): Country[] {
  return filterByBudget(
    filterByVisited(
      filterByExperiences(filterByMonth(countries, month), experiences),
      visited,
      visitedFilter
    ),
    budget,
    budgetBasis,
  );
}

export function allUniqueExperiences(countries: Country[]): string[] {
  return [...new Set(countries.flatMap((c) => c.experiences))].sort();
}
