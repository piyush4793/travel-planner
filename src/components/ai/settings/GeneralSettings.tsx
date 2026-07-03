import type { BudgetBasis } from "../../../core/utils/budget";
import HomeCountrySelector from "../../shared/HomeCountrySelector";
import BudgetBasisPills from "../../shared/BudgetBasisPills";

type Props = {
  homeCountry: string;
  onHomeCountryChange: (v: string) => void;
  budgetBasis: BudgetBasis;
  onBudgetBasisChange: (b: BudgetBasis) => void;
};

/**
 * General settings: app-wide defaults (home country + budget party size) plus
 * an About block. Budget basis here is the persisted global default that seeds
 * every surface (panel, calendar, filters); Trips keeps a session-local override.
 */
export default function GeneralSettings({
  homeCountry,
  onHomeCountryChange,
  budgetBasis,
  onBudgetBasisChange,
}: Props) {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-700">Home country</label>
        <p className="text-[11px] text-slate-500">Where your trips depart from — used for travel estimates.</p>
        <HomeCountrySelector value={homeCountry} onChange={onHomeCountryChange} variant="light" />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-700">Default budget party size</label>
        <p className="text-[11px] text-slate-500">
          Sets the baseline for costs shown across the app. Trips can be switched temporarily without changing this default.
        </p>
        <BudgetBasisPills
          value={budgetBasis}
          onChange={onBudgetBasisChange}
          variant="light"
          showLabel
          ariaLabel="Default budget party size"
        />
      </div>

      <div className="pt-1 border-t border-slate-100">
        <p className="text-[11px] text-slate-500">
          <span className="font-semibold text-slate-600">Roamwise</span> · v{__APP_VERSION__} · {__BUILD_TIME__}
        </p>
      </div>
    </div>
  );
}
