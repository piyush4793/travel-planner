import type { Country, VisitedFilter } from "../types";
import { expandMonth } from "./months";

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
export type BudgetBasis = "solo" | "couple" | "family4";

function parseBudgetLower(budget: string): number {
  const match = budget.match(/₹([\d.]+)([KL])/);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  return match[2] === "K" ? val * 1000 : val * 100000;
}

export function getBudgetTier(budget: string): "budget" | "mid" | "premium" {
  const lower = parseBudgetLower(budget);
  if (lower <= 150000) return "budget";
  if (lower <= 300000) return "mid";
  return "premium";
}

function getBudgetForBasis(country: Country, basis: BudgetBasis): string {
  return country.budgetBreakdown?.[basis] ?? country.budget;
}

export function filterByBudget(countries: Country[], tier: BudgetTier, basis: BudgetBasis = "couple"): Country[] {
  if (tier === "all") return countries;
  return countries.filter((c) => getBudgetTier(getBudgetForBasis(c, basis)) === tier);
}

export function applyFilters(
  countries: Country[],
  month: string[],
  experiences: string[],
  visited: Set<string>,
  visitedFilter: VisitedFilter,
  budget: BudgetTier,
  budgetBasis: BudgetBasis = "couple",
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
