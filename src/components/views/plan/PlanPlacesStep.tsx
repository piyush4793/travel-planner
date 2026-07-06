import { memo, useEffect, useMemo, useState } from "react";
import type { CityEntry } from "../../../core/types";
import type { CountryRule } from "../../../core/data/itineraryRules";
import { type TripPlan, extractPlanCities, planCostBasisIcon, planCostBasisLabel } from "../../../core/utils/tripPlans";
import { type BudgetBasis, BUDGET_BASIS_META, BUDGET_BASIS_ORDER } from "../../../core/utils/budget";
import {
  decideCities,
  sortDecisions,
  summarizeFocus,
  CITY_SORT_META,
  type CityDecision,
  type CitySort,
} from "../../../core/utils/decideCities";
import { getCountryFlag } from "../../../utils/countryFlags";
import PlanMenu from "./PlanMenu";
import PlanFilters from "./PlanFilters";

/**
 * One stop's city-picking state, normalised so the step is agnostic to whether
 * it came from the primary funnel ({@link usePlanBuilder}) or an additional-stop
 * planner ({@link useTripPlanner}). `autoSelectedCities` marks the vibe auto plan
 * until the traveller hand-picks (then `selectedCities` wins). `rule` supplies the
 * per-city decision meta (recommended days, signature themes).
 */
export interface PlacesUnit {
  name: string;
  orderedCities: CityEntry[];
  selectedCities: string[];
  autoSelectedCities: string[];
  customDays: number;
  /** This stop's effective experience focus (per-country). */
  activeExperiences: string[];
  /** All experience tags this country's cities offer (Filters options). */
  experienceOptions: string[];
  rule: CountryRule | null;
  onToggleCity: (city: string) => void;
  onClearCities: () => void;
  /** Toggle one experience for THIS stop only. */
  onToggleExperience: (exp: string) => void;
  /** Clear THIS stop's experience focus. */
  onClearExperiences: () => void;
}

interface Props {
  units: PlacesUnit[];
  /** Composed itinerary across every stop — drives the trip stats strip. */
  plan: TripPlan | null;
  /** Trip-scoped "who's going" basis (drives the budget figure). */
  budgetBasis: BudgetBasis;
  setBudgetBasis: (b: BudgetBasis) => void;
}

function pluralize(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function includedCount(unit: PlacesUnit): number {
  return unit.selectedCities.length > 0 ? unit.selectedCities.length : unit.autoSelectedCities.length;
}

const CARET = (
  <svg className="h-2.5 w-2.5 shrink-0 opacity-60" viewBox="0 0 10 6" fill="currentColor" aria-hidden="true">
    <path d="M0 0l5 6 5-6z" />
  </svg>
);

/**
 * A city rendered as a decision card (design "D3"). The left column answers
 * "what & why": name, a one-line "known for" brief, and experience chips with the
 * traveller's focus lit (emerald) and a few others muted — so the match is legible
 * at a glance without tag soup (capped at {@link MAX_CHIPS}). The right rail answers
 * "how long & when": recommended stay, best window, and an amber avoid window.
 * "Included" is a calm emerald tint, not a heavy block, so a long auto-plan stays
 * readable two-up in the grid.
 */
const MAX_CHIPS = 4;

const DecisionCard = memo(function DecisionCard({ d, onToggle }: { d: CityDecision; onToggle: () => void }) {
  const focusLabel = d.focusMatches.length > 0 ? ` — matches ${d.focusMatches.join(", ")}` : "";
  const mutedChips = d.otherExperiences.slice(0, Math.max(0, MAX_CHIPS - d.focusMatches.length));
  const hasRail = d.recDays > 0 || d.bestWindow !== null || d.avoidWindow !== null;
  return (
    <button
      onClick={onToggle}
      aria-pressed={d.included}
      aria-label={`${d.name}${focusLabel}`}
      className={`focus-ring-emerald flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${
        d.included
          ? "border-emerald-200 bg-emerald-50/70 hover:border-emerald-300"
          : "border-[#e6e1d4] bg-white/70 hover:border-[#cfc9b8]"
      }`}
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold transition-colors ${
          d.included ? "border-emerald-600 bg-emerald-600 text-white" : "border-[#cfc9b8] text-[#cfc9b8]"
        }`}
      >
        {d.included ? "✓" : "+"}
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#16241d]">{d.name}</span>
          {d.signal && (
            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{d.signal}</span>
          )}
        </span>

        {d.brief && <span className="line-clamp-1 text-[11.5px] leading-snug text-[#6f6a5d]">{d.brief}</span>}

        {(d.focusMatches.length > 0 || mutedChips.length > 0) && (
          <span className="mt-0.5 flex flex-wrap gap-1">
            {d.focusMatches.map((e) => (
              <span key={e} className="rounded-full border border-emerald-600 bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">{e}</span>
            ))}
            {mutedChips.map((e) => (
              <span key={e} className="rounded-full border border-[#e0dccb] bg-[#faf8f1] px-2 py-0.5 text-[10px] font-semibold text-[#8a8577]">{e}</span>
            ))}
          </span>
        )}
      </span>

      {hasRail && (
        <span className="flex shrink-0 flex-col items-end gap-0.5 self-stretch border-l border-[#ece7d8] pl-3 text-right">
          {d.recDays > 0 && <span className="font-display text-[15px] font-bold text-[#16241d]">≈{d.recDays}d</span>}
          {d.bestWindow && <span className="whitespace-nowrap text-[10.5px] text-[#8a8577]">☀ {d.bestWindow}</span>}
          {d.avoidWindow && <span className="whitespace-nowrap text-[10.5px] text-amber-700">⚠ {d.avoidWindow}</span>}
        </span>
      )}
    </button>
  );
});

function CountrySwitcher({ units, activeIndex, onSelect }: { units: PlacesUnit[]; activeIndex: number; onSelect: (i: number) => void }) {
  const active = units[activeIndex];
  return (
    <PlanMenu
      ariaLabel="Switch country"
      width={340}
      triggerClassName="flex min-w-0 max-w-full items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-white transition-colors hover:bg-white/15 focus-ring-emerald"
      trigger={
        <>
          <span aria-hidden="true">{getCountryFlag(active.name)}</span>
          <span className="min-w-0 line-clamp-1 font-display text-base font-semibold">{active.name}</span>
          {CARET}
        </>
      }
    >
      {(close) => (
        <ul className="max-h-[60vh] overflow-y-auto py-1">
          {units.map((u, i) => (
            <li key={u.name}>
              <button
                role="menuitemradio"
                aria-checked={i === activeIndex}
                onClick={() => { onSelect(i); close(); }}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors focus-ring-emerald ${
                  i === activeIndex ? "bg-emerald-50" : "hover:bg-[#faf8f1]"
                }`}
              >
                <span className="w-4 shrink-0 text-emerald-600" aria-hidden="true">{i === activeIndex ? "✓" : ""}</span>
                <span aria-hidden="true">{getCountryFlag(u.name)}</span>
                <span className="min-w-0 flex-1 line-clamp-1 font-display text-[15px] font-semibold text-[#16241d]">{u.name}</span>
                <span className="shrink-0 whitespace-nowrap text-[12px] font-medium text-[#8a8577]">
                  {pluralize(includedCount(u), "place")} · {u.customDays}d
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </PlanMenu>
  );
}

function WhoGoingMenu({ basis, setBasis }: { basis: BudgetBasis; setBasis: (b: BudgetBasis) => void }) {
  const meta = BUDGET_BASIS_META[basis];
  return (
    <PlanMenu
      ariaLabel="Who's going"
      width={220}
      triggerClassName="flex shrink-0 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[13px] text-white transition-colors hover:bg-white/15 focus-ring-emerald"
      trigger={
        <>
          <span aria-hidden="true">{meta.icon}</span>
          <span className="font-semibold">{meta.label}</span>
          {CARET}
        </>
      }
    >
      {(close) => (
        <ul className="py-1">
          {BUDGET_BASIS_ORDER.map((b) => {
            const m = BUDGET_BASIS_META[b];
            return (
              <li key={b}>
                <button
                  role="menuitemradio"
                  aria-checked={b === basis}
                  onClick={() => { setBasis(b); close(); }}
                  className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] transition-colors focus-ring-emerald ${
                    b === basis ? "bg-emerald-50 font-semibold text-emerald-800" : "text-[#3c463f] hover:bg-[#faf8f1]"
                  }`}
                >
                  <span className="w-3 text-emerald-600" aria-hidden="true">{b === basis ? "✓" : ""}</span>
                  <span aria-hidden="true">{m.icon}</span>
                  {m.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </PlanMenu>
  );
}

function SortMenu({ sort, onChange }: { sort: CitySort; onChange: (s: CitySort) => void }) {
  const label = CITY_SORT_META.find((s) => s.key === sort)?.label ?? "Best match";
  return (
    <PlanMenu
      ariaLabel="Sort places"
      width={200}
      triggerClassName="flex min-h-[36px] items-center gap-1.5 rounded-full border border-[#d9d3c4] bg-white px-3.5 py-2 text-[13px] focus-ring-emerald"
      trigger={
        <>
          <span className="text-[#8a8577]">Sort</span>
          <span className="font-semibold text-[#16241d]">{label}</span>
          {CARET}
        </>
      }
    >
      {(close) => (
        <ul className="py-1">
          {CITY_SORT_META.map((s) => (
            <li key={s.key}>
              <button
                role="menuitemradio"
                aria-checked={s.key === sort}
                onClick={() => { onChange(s.key); close(); }}
                className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] transition-colors focus-ring-emerald ${
                  s.key === sort ? "bg-emerald-50 font-semibold text-emerald-800" : "text-[#3c463f] hover:bg-[#faf8f1]"
                }`}
              >
                <span className="w-3 text-emerald-600" aria-hidden="true">{s.key === sort ? "✓" : ""}</span>
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </PlanMenu>
  );
}

/** Card grid for one stop, split into "in plan" then a revealable "more options". */
function UnitCities({ unit, sort }: { unit: PlacesUnit; sort: CitySort }) {
  const [showAll, setShowAll] = useState(false);
  useEffect(() => { setShowAll(false); }, [unit.name]);

  const decisions = useMemo(() => sortDecisions(decideCities(unit), sort), [unit, sort]);
  const included = decisions.filter((d) => d.included);
  const rest = decisions.filter((d) => !d.included);

  return (
    <div className="space-y-4">
      {included.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#a8a291]">In your plan</p>
          <div className="grid gap-2 lg:grid-cols-2">
            {included.map((d) => (
              <DecisionCard key={d.name} d={d} onToggle={() => unit.onToggleCity(d.name)} />
            ))}
          </div>
        </div>
      )}

      {rest.length > 0 && (
        showAll ? (
          <div>
            {included.length > 0 && (
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#a8a291]">More options</p>
            )}
            <div className="grid gap-2 lg:grid-cols-2">
              {rest.map((d) => (
                <DecisionCard key={d.name} d={d} onToggle={() => unit.onToggleCity(d.name)} />
              ))}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAll(true)}
            className="focus-ring-emerald min-h-[44px] w-full rounded-xl border border-dashed border-[#cfc9b8] bg-transparent px-3 py-2.5 text-[13px] font-semibold text-emerald-800 transition-colors hover:border-emerald-400 hover:bg-emerald-50/40"
          >
            Show {rest.length} more {rest.length === 1 ? "place" : "places"} in {unit.name} ↓
          </button>
        )
      )}
    </div>
  );
}

/**
 * Places step — pick the cities for each stop as *decisions*, not checkboxes.
 * A consolidated dark header card carries identity (country switcher for a
 * multi-stop route, static name for one) + trip stats + the trip-scoped "who's
 * going" basis. Below it, a section title with an overflow-safe focus subline,
 * a single per-country "Filters" control (experiences today, extensible) and a
 * Sort control, then a two-up decision grid on wide screens. The step molds to
 * its data: a single stop hides the switcher and the countries stat. Experiences
 * are per-country — Basics seeds the trip vibe, Filters here diverges one stop.
 */
function PlanPlacesStep({ units, plan, budgetBasis, setBudgetBasis }: Props) {
  const multi = units.length > 1;
  const [sort, setSort] = useState<CitySort>("best");
  const [activeIndex, setActiveIndex] = useState(0);

  // Keep the active country valid as the route grows or shrinks.
  useEffect(() => {
    setActiveIndex((i) => Math.min(i, Math.max(0, units.length - 1)));
  }, [units.length]);

  if (units.length === 0) return null;
  const activeUnit = units[Math.min(activeIndex, units.length - 1)];

  const totalDays = plan ? plan.days.length : units.reduce((sum, u) => sum + u.customDays, 0);
  const totalPlaces = plan ? extractPlanCities(plan.days).length : units.reduce((sum, u) => sum + includedCount(u), 0);
  const focus = summarizeFocus(activeUnit.activeExperiences);

  return (
    <div className="space-y-5">
      {/* Consolidated header card */}
      <div className="rounded-2xl bg-[#16241d] px-4 py-3.5 text-white sm:px-5 sm:py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {multi ? (
            <CountrySwitcher units={units} activeIndex={activeIndex} onSelect={setActiveIndex} />
          ) : (
            <div className="flex min-w-0 items-center gap-2">
              <span aria-hidden="true">{getCountryFlag(activeUnit.name)}</span>
              <span className="min-w-0 line-clamp-1 font-display text-lg font-semibold">{activeUnit.name}</span>
            </div>
          )}
          <WhoGoingMenu basis={budgetBasis} setBasis={setBudgetBasis} />
        </div>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-[13px] text-white/80">
          <span><span className="font-semibold text-white">{totalDays}</span> {totalDays === 1 ? "day" : "days"}</span>
          <span aria-hidden="true" className="text-white/30">·</span>
          <span><span className="font-semibold text-white">{totalPlaces}</span> {totalPlaces === 1 ? "place" : "places"}</span>
          {multi && (
            <>
              <span aria-hidden="true" className="text-white/30">·</span>
              <span><span className="font-semibold text-white">{units.length}</span> countries</span>
            </>
          )}
          {plan && (
            <span className="ml-auto whitespace-nowrap font-bold text-emerald-300">
              {plan.costPerPerson}{" "}
              <span title={planCostBasisLabel(plan)} aria-label={planCostBasisLabel(plan)}>{planCostBasisIcon(plan)}</span>
            </span>
          )}
        </div>
      </div>

      {/* Section header + controls */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h3 className="line-clamp-1 font-display text-base font-semibold text-[#16241d]">Cities in {activeUnit.name}</h3>
          <p className="mt-0.5 text-[11px] font-medium text-[#8a8577]">
            {includedCount(activeUnit)} in plan · {pluralize(activeUnit.orderedCities.length, "option")}
            {focus && (
              <>
                {" "}· focus:{" "}
                <span className="text-emerald-700" title={activeUnit.activeExperiences.join(", ")}>{focus}</span>
              </>
            )}
            {activeUnit.selectedCities.length > 0 && (
              <>
                {" "}· <span className="font-bold text-emerald-700">Edited</span> ·{" "}
                <button
                  onClick={activeUnit.onClearCities}
                  className="focus-ring-emerald -my-1 inline-flex min-h-[28px] items-center gap-1 rounded px-1 py-1 align-baseline font-bold text-emerald-700 underline-offset-2 transition-colors hover:text-emerald-800 hover:underline"
                >
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 12a9 9 0 1 0 3-6.7" />
                    <path d="M3 3v4.5H7.5" />
                  </svg>
                  Reset to suggested
                </button>
              </>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <PlanFilters
            country={activeUnit.name}
            options={activeUnit.experienceOptions}
            selected={activeUnit.activeExperiences}
            onToggle={activeUnit.onToggleExperience}
            onClear={activeUnit.onClearExperiences}
          />
          <SortMenu sort={sort} onChange={setSort} />
        </div>
      </div>

      <UnitCities key={activeUnit.name} unit={activeUnit} sort={sort} />
    </div>
  );
}

export default memo(PlanPlacesStep);
