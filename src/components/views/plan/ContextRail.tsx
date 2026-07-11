import { memo, useEffect, useRef } from "react";
import type { Country } from "../../../core/types";
import type { BudgetBasis } from "../../../core/utils/budget";
import MonthHeatmap from "../../country/panel/MonthHeatmap";
import TripReadiness from "../../country/panel/TripReadiness";
import { LearnAboutSection, PlanningResourcesSection, UsefulLinksSection } from "../../country/panel/InfoSections";
import PlanBudgetPanel from "./PlanBudgetPanel";
import PlanNotesSection from "./PlanNotesSection";
import RailSection from "./RailSection";
import type { PlanActions } from "./planActions";

type Props = {
  country: Country;
  activeBasis: BudgetBasis;
  onBasisChange: (basis: BudgetBasis) => void;
  homeCountry: string;
  actions: PlanActions;
};

/**
 * Right "Good to know" rail — reference the traveller reads (never a lever):
 * trip readiness, budget by party size, when to go, decision tips, personal
 * notes, and lazy research links. Each section renders only when the destination
 * carries that data, so the rail never shows empty chrome.
 */
function ContextRailInner({ country, activeBasis, onBasisChange, homeCountry, actions }: Props) {
  const best = country.bestMonths ?? [];
  const worst = country.worstMonths ?? [];
  const avoid = country.avoid ?? [];
  const combo = country.combo ?? [];
  const hasWhen = best.length > 0 || worst.length > 0;
  const hasTips = !!country.stopoverNote || avoid.length > 0 || combo.length > 0;
  const hasNotes = actions.notes.trim().length > 0;

  // Keep the latest country name in a ref so LearnAboutSection can drop stale
  // async results when the traveller switches destinations.
  const currentCountryNameRef = useRef<string | null>(country.name);
  useEffect(() => {
    currentCountryNameRef.current = country.name;
  }, [country.name]);

  return (
    <div className="space-y-2.5">
      <RailSection title="Trip readiness" hint="your checklist" defaultOpen>
        <TripReadiness
          country={country}
          isVisited={actions.isVisited}
          isFavorite={actions.isFavorite}
          aiPlanCount={actions.aiPlanCount}
          hasNotes={hasNotes}
        />
      </RailSection>

      <RailSection title="Budget" hint="by who's going" defaultOpen>
        <PlanBudgetPanel country={country} activeBasis={activeBasis} onBasisChange={onBasisChange} />
      </RailSection>

      {hasWhen && (
        <RailSection title="When to go" count={best.length + worst.length}>
          <MonthHeatmap bestMonths={best} worstMonths={worst} />
        </RailSection>
      )}

      {hasTips && (
        <RailSection title="Good to know" hint="tips & pairings">
          <div className="space-y-3">
            {country.stopoverNote && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">✈️ Stopover tip</p>
                <p className="text-[11px] leading-relaxed text-emerald-900">{country.stopoverNote}</p>
              </div>
            )}
            {avoid.length > 0 && (
              <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-600">⚠️ Watch out for</p>
                <ul className="space-y-1">
                  {avoid.map((item) => (
                    <li key={item} className="flex gap-1.5 text-[11px] leading-snug text-amber-800">
                      <span className="mt-0.5 shrink-0" aria-hidden="true">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {combo.length > 0 && (
              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-4">Pairs well with</p>
                <div className="flex flex-wrap gap-1.5">
                  {combo.map((name) => (
                    <span
                      key={name}
                      className="rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-ink-2"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </RailSection>
      )}

      {actions.onSaveNotes && (
        <RailSection title="Notes" hint="private to you" count={hasNotes ? 1 : undefined}>
          <PlanNotesSection notes={actions.notes} onSave={actions.onSaveNotes} />
        </RailSection>
      )}

      <RailSection title="Before you go" hint="learn, visas, links">
        <div className="space-y-2.5">
          <LearnAboutSection countryName={country.name} currentCountryNameRef={currentCountryNameRef} />
          <PlanningResourcesSection countryName={country.name} homeCountry={homeCountry} />
          <UsefulLinksSection links={country.links} />
        </div>
      </RailSection>
    </div>
  );
}

const ContextRail = memo(ContextRailInner);
export default ContextRail;
