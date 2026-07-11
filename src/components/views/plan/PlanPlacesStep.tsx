import { memo, useEffect, useMemo, useState } from "react";
import type { CityEntry } from "../../../core/types";
import type { CountryRule } from "../../../core/data/itineraryRules";
import {
  decideCities,
  sortDecisions,
  summarizeFocus,
  CITY_SORT_META,
  type CityDecision,
  type CitySort,
} from "../../../core/utils/decideCities";
import PlanMenu from "./PlanMenu";
import PlanFilters from "./PlanFilters";
import CityDetailModal from "./CityDetailModal";

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
  /** Controlled active-country index (shared with the header switcher). */
  activeIndex: number;
}

function pluralize(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function includedCount(unit: PlacesUnit): number {
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

const DecisionCard = memo(function DecisionCard({ d, onToggle, onDetails }: { d: CityDecision; onToggle: () => void; onDetails: () => void }) {
  const focusLabel = d.focusMatches.length > 0 ? ` — matches ${d.focusMatches.join(", ")}` : "";
  const mutedChips = d.otherExperiences.slice(0, Math.max(0, MAX_CHIPS - d.focusMatches.length));
  const hasRail = d.recDays > 0 || d.bestWindow !== null || d.avoidWindow !== null;
  return (
    <div
      className={`relative flex w-full items-start gap-3.5 rounded-xl border px-3.5 py-3 text-left transition-colors ${
        d.included
          ? "border-emerald-200 bg-emerald-50/70 hover:border-emerald-300"
          : "border-[#e6e1d4] bg-white/70 hover:border-[#cfc9b8]"
      }`}
    >
      {/* Full-card toggle target sits beneath the content so a tap anywhere adds/drops the stop. */}
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={d.included}
        aria-label={`${d.name}${focusLabel}`}
        className="focus-ring-emerald absolute inset-0 rounded-xl"
      />

      <span
        aria-hidden="true"
        className={`pointer-events-none mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold transition-colors ${
          d.included ? "border-emerald-600 bg-emerald-600 text-white" : "border-[#cfc9b8] text-[#cfc9b8]"
        }`}
      >
        {d.included ? "✓" : "+"}
      </span>

      <span className="pointer-events-none flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-start gap-x-2">
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="max-w-full truncate text-sm font-semibold text-[#16241d]">{d.name}</span>
            {d.signal && (
              <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{d.signal}</span>
            )}
          </span>
          <button
            type="button"
            onClick={onDetails}
            aria-label={`${d.name} details`}
            aria-haspopup="dialog"
            className="focus-ring-emerald pointer-events-auto relative z-10 -mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#dfdac9] bg-white text-emerald-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 11v5" />
              <path d="M12 7.6h.01" />
            </svg>
          </button>
        </span>

        {d.brief && <span title={d.brief} className="line-clamp-1 text-[11.5px] leading-snug text-[#6f6a5d]">{d.brief}</span>}

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
        <span className="pointer-events-none flex w-[84px] shrink-0 flex-col items-end gap-0.5 self-stretch border-l border-[#ece7d8] pl-3 text-right">
          {d.recDays > 0 && <span className="font-display text-[15px] font-bold text-[#16241d]">≈{d.recDays}d</span>}
          {d.bestWindow && <span className="whitespace-nowrap text-[10.5px] text-[#8a8577]">☀ {d.bestWindow}</span>}
          {d.avoidWindow && <span className="whitespace-nowrap text-[10.5px] text-amber-700">⚠ {d.avoidWindow}</span>}
        </span>
      )}
    </div>
  );
});

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
  const [detailName, setDetailName] = useState<string | null>(null);
  useEffect(() => { setShowAll(false); setDetailName(null); }, [unit.name]);

  const decisions = useMemo(() => sortDecisions(decideCities(unit), sort), [unit, sort]);
  const included = decisions.filter((d) => d.included);
  const rest = decisions.filter((d) => !d.included);
  const detail = detailName ? decisions.find((d) => d.name === detailName) ?? null : null;

  return (
    <div className="space-y-4">
      {included.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#a8a291]">In your plan</p>
          <div className="grid gap-2 lg:grid-cols-2">
            {included.map((d) => (
              <DecisionCard key={d.name} d={d} onToggle={() => unit.onToggleCity(d.name)} onDetails={() => setDetailName(d.name)} />
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
                <DecisionCard key={d.name} d={d} onToggle={() => unit.onToggleCity(d.name)} onDetails={() => setDetailName(d.name)} />
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

      {detail && (
        <CityDetailModal
          decision={detail}
          onToggle={() => unit.onToggleCity(detail.name)}
          onClose={() => setDetailName(null)}
        />
      )}
    </div>
  );
}

/**
 * Places step — pick the cities for each stop as *decisions*, not checkboxes.
 * Identity, trip stats and the "who's going" basis now live in the shared
 * {@link PlanTripHeader} (the header hosts the country switcher for a multi-stop
 * route), so this step focuses purely on the decision surface: a section title
 * with an overflow-safe focus subline, a single per-country "Filters" control
 * (experiences today, extensible) and a Sort control, then a two-up decision
 * grid on wide screens. The active country is controlled by the parent so the
 * header switcher and this body stay in lock-step. Experiences are per-country —
 * Basics seeds the trip vibe, Filters here diverges one stop.
 */
function PlanPlacesStep({ units, activeIndex }: Props) {
  const [sort, setSort] = useState<CitySort>("best");

  if (units.length === 0) return null;
  const safeIndex = Math.min(Math.max(0, activeIndex), units.length - 1);
  const activeUnit = units[safeIndex];
  const focus = summarizeFocus(activeUnit.activeExperiences);

  return (
    <div className="space-y-5">
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
