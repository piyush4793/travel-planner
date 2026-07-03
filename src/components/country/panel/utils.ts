import type { Country } from "../../../core/types";
import type { useCountryRule } from "../../../hooks/useCountryRule";
import { getBudgetDisplay } from "../../../core/types";
import { BUDGET_BASIS_META, BUDGET_BASIS_ORDER, type BudgetBasis } from "../../../core/utils/budget";

export type BudgetBadge = { basis?: BudgetBasis; icon: string; label: string };

export function getBudgetBadges(
  country: Country,
  consolidated: ReturnType<typeof useCountryRule>["data"],
): BudgetBadge[] {
  // User-edited per-basis budget wins over the raw rule data; fall back to the
  // single budget string only when no breakdown exists at all.
  const breakdown = country.budgetBreakdown ?? consolidated?.budget;
  if (breakdown) {
    return BUDGET_BASIS_ORDER.map((basis) => ({
      basis,
      icon: BUDGET_BASIS_META[basis].icon,
      label: breakdown[basis],
    }));
  }

  return [{ icon: "💸", label: getBudgetDisplay(country.budget) }];
}

export function getRangePercent(value: number, max: number) {
  if (max <= 1) return 0;
  return ((value - 1) / (max - 1)) * 100;
}
