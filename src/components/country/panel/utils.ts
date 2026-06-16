import type { Country } from "../../../core/types";
import type { useCountryRule } from "../../../hooks/useCountryRule";
import { getBudgetDisplay } from "../../../core/types";

export function getBudgetBadges(
  country: Country,
  consolidated: ReturnType<typeof useCountryRule>["data"],
) {
  if (consolidated) {
    return [
      { icon: "👤", label: consolidated.budget.solo, className: "bg-slate-100 text-slate-600" },
      { icon: "👫", label: consolidated.budget.couple, className: "bg-blue-50 text-blue-600" },
      { icon: "👨‍👩‍👧‍👦", label: consolidated.budget.family4, className: "bg-purple-50 text-purple-600" },
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
