import type { Country } from "../../../core/types";
import type { useCountryRule } from "../../../hooks/useCountryRule";
import { getBudgetDisplay } from "../../../core/types";

export function getBudgetBadges(
  country: Country,
  consolidated: ReturnType<typeof useCountryRule>["data"],
) {
  // User-edited per-basis budget wins over the raw rule data; fall back to the
  // single budget string only when no breakdown exists at all.
  const breakdown = country.budgetBreakdown ?? consolidated?.budget;
  if (breakdown) {
    return [
      { icon: "👤", label: breakdown.solo, className: "bg-slate-100 text-slate-600" },
      { icon: "👫", label: breakdown.couple, className: "bg-blue-50 text-blue-600" },
      { icon: "👨‍👩‍👧‍👦", label: breakdown.family4, className: "bg-purple-50 text-purple-600" },
    ];
  }

  return [
    { icon: "💸", label: getBudgetDisplay(country.budget), className: "bg-slate-100 text-slate-600" },
  ];
}

export function getRangePercent(value: number, max: number) {
  if (max <= 1) return 0;
  return ((value - 1) / (max - 1)) * 100;
}
