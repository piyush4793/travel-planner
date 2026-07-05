import { memo } from "react";
import type { Country } from "../../../core/types";
import { BUDGET_BASIS_META, BUDGET_BASIS_ORDER, type BudgetBasis } from "../../../core/utils/budget";
import { getBudgetBadges } from "../../country/panel/utils";
import Tooltip from "../../shared/Tooltip";

type Props = {
  country: Country;
  activeBasis: BudgetBasis;
  onBasisChange: (basis: BudgetBasis) => void;
};

/**
 * Per-party-size budget reference for the Plan workspace. Shows solo / couple /
 * family totals side by side and lets the traveller switch the active basis
 * inline — so the itinerary's cost figure updates without stepping back to
 * Basics. Totals are a static full-trip reference (not day-slider aware); the
 * centre summary bar carries the live active-basis figure.
 */
function PlanBudgetPanelInner({ country, activeBasis, onBasisChange }: Props) {
  const badges = getBudgetBadges(country, null);
  const perBasis = badges.filter((b) => b.basis != null);

  // Fall back to the single, basis-less budget when no breakdown exists.
  if (perBasis.length === 0) {
    return (
      <p className="text-sm font-semibold text-[#1e2a25]">
        <span aria-hidden="true">{badges[0]?.icon} </span>
        {badges[0]?.label ?? "—"}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#a8a293]">Who's paying?</p>
        <Tooltip
          variant="wrap"
          text="Typical full-trip budget per traveller basis — a static reference. The centre summary shows the live figure for the length you pick."
          triggerClassName="focus-ring-emerald inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#efeadd] text-[9px] font-bold text-[#a09a89]"
        >
          <span aria-hidden="true">ⓘ</span>
        </Tooltip>
      </div>
      <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Budget by traveller basis">
        {BUDGET_BASIS_ORDER.map((basis) => {
          const badge = perBasis.find((b) => b.basis === basis);
          if (!badge) return null;
          const active = basis === activeBasis;
          return (
            <button
              key={basis}
              type="button"
              onClick={() => onBasisChange(basis)}
              aria-pressed={active}
              title={BUDGET_BASIS_META[basis].long}
              className={`focus-ring-emerald flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-xl border px-1.5 py-2 text-center transition-colors ${
                active
                  ? "border-emerald-700 bg-emerald-700 text-white shadow-sm"
                  : "border-[#e4dece] bg-white text-[#1e2a25] hover:border-emerald-500 hover:bg-emerald-50"
              }`}
            >
              <span aria-hidden="true" className="text-sm leading-none">{BUDGET_BASIS_META[basis].icon}</span>
              <span className={`text-[9px] font-bold uppercase tracking-wide ${active ? "text-emerald-50" : "text-[#a09a89]"}`}>
                {BUDGET_BASIS_META[basis].label}
              </span>
              <span className="text-[10px] font-bold leading-tight tabular-nums">{badge.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const PlanBudgetPanel = memo(PlanBudgetPanelInner);
export default PlanBudgetPanel;
