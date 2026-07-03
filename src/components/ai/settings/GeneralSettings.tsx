import type { BudgetBasis } from "../../../core/utils/budget";
import HomeCountrySelector from "../../shared/HomeCountrySelector";
import BudgetBasisPills from "../../shared/BudgetBasisPills";
import { SectionCard } from "./SettingsUI";

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
    <div className="space-y-4">
      <SectionCard
        title="Home country"
        icon={"\u{1F3E0}"}
        accent="bg-blue-100 text-blue-600"
        desc="Where your trips depart from — used for travel estimates."
      >
        <HomeCountrySelector value={homeCountry} onChange={onHomeCountryChange} variant="light" />
      </SectionCard>

      <SectionCard
        title="Default budget party size"
        icon={"\u{1F4B0}"}
        accent="bg-emerald-100 text-emerald-600"
        desc="Sets the baseline for costs shown across the app. Trips can be switched temporarily without changing this default."
      >
        <BudgetBasisPills
          value={budgetBasis}
          onChange={onBudgetBasisChange}
          variant="light"
          showLabel
          ariaLabel="Default budget party size"
        />
      </SectionCard>

      <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-slate-400">
        <span className="font-semibold text-slate-500">Roamwise</span>
        <span aria-hidden="true">·</span>
        <span>v{__APP_VERSION__}</span>
        <span aria-hidden="true">·</span>
        <span>{__BUILD_TIME__}</span>
      </div>
    </div>
  );
}
