import { useEffect, useMemo, useState } from "react";
import type { Country } from "@/core/types";
import type { DestinationSource, TripScope } from "@/core/trip/destinationSource";
import { unitFlag } from "@/core/trip/unitFlag";
import { MAX_TRIP_UNITS, toggleTripSelection } from "@/core/utils/multiCountry";
import { MONTHS, expandMonth } from "@/core/utils/months";
import { monthFit, rankByMonthFit, type MonthFit } from "@/core/utils/monthFit";
import PlanPopover from "@/components/views/plan/ui/PlanPopover";
import ScopeToggle from "./ScopeToggle";

type Props = {
  /** Scope data source — provides combo suggestions, unit nouns and resolution. */
  source: DestinationSource;
  /** Recently-planned destinations, most-recent first (implicit My List). */
  countries: Country[];
  /** Plannable destinations NOT recently planned, most popular first. */
  exploreCountries: Country[];
  /** Start the wizard with an ordered selection (1 unit = single-destination trip). */
  onStart: (countries: Country[]) => void;
  /** When true, chips accumulate into a multi-unit selection confirmed via a Go arrow. */
  multiSelect?: boolean;
  /** Max units per trip (multi-select only). */
  maxSelection?: number;
  /** Show the International/Within-home scope toggle (home-country travellers). */
  showScopeToggle?: boolean;
  /** Switch the active scope (landing only). */
  onScopeChange?: (scope: TripScope) => void;
  /** The traveller's home country — labels the domestic scope + flags its units. */
  homeCountry?: string;
};

const EXPLORE_LIMIT = 12;
const MINE_LIMIT = 8;

/** International sovereign-catalog region order — used to keep the world regions
 *  in a familiar order. Domestic (or any other scope) derives its own regions
 *  from the data, so this is only a display-order hint, never a hard list. */
const INTL_REGION_ORDER = ["Asia", "Europe", "Middle East", "Africa", "Americas", "Oceania"];

const CHIP_BASE =
  "focus-ring-emerald group inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2.5 text-sm shadow-[0_1px_2px_rgba(20,40,30,0.05)] transition-[transform,box-shadow,border-color,color] motion-safe:animate-[fadeInUp_0.28s_ease-out_both] hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-[0_1px_2px_rgba(20,40,30,0.05)]";
const CHIP_TONE_DEFAULT = "border-line bg-white font-medium text-ink-1 hover:border-emerald-600 hover:text-emerald-800";
const CHIP_TONE_AVOID = "border-amber-200 bg-amber-50/40 font-medium text-ink-2 hover:border-amber-400 hover:text-amber-800";

const TOKEN_TONE_DEFAULT = "border-emerald-200 bg-emerald-50 text-emerald-800";
const TOKEN_TONE_AVOID = "border-amber-300 bg-amber-100/70 text-amber-900";
const TOKEN_REMOVE_DEFAULT = "text-emerald-500 hover:bg-emerald-100 hover:text-emerald-700";
const TOKEN_REMOVE_AVOID = "text-amber-600 hover:bg-amber-200/70 hover:text-amber-800";

/**
 * Seasonality cue shared by the browse chips and the selected tokens, so a
 * chosen destination reads the same good/off-season signal whether it's on the
 * board or already in the trip. Returns `null` when there's no lens or no data.
 */
function monthCue(fit: MonthFit, month: string | null): { icon: string; label: string } | null {
  if (!month || fit === "neutral") return null;
  return fit === "best"
    ? { icon: "☀️", label: `great in ${expandMonth(month)}` }
    : { icon: "⚠️", label: `avoid ${expandMonth(month)}` };
}

/**
 * Auto-focusing the search field is a welcome shortcut with a physical keyboard,
 * but on touch devices it force-opens the on-screen keyboard and jumps the
 * scroll — so we only claim focus for fine pointers. Guarded for non-DOM/test
 * environments where `matchMedia` may be absent.
 */
function prefersAutoFocus(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return !window.matchMedia("(pointer: coarse)").matches;
}

/** Word-prefix > any-substring match ranking; -1 means no match. */
function matchRank(name: string, q: string): number {
  const n = name.toLowerCase();
  if (n.startsWith(q)) return 0;
  if (n.split(/\s+/).some((w) => w.startsWith(q))) return 1;
  if (n.includes(q)) return 2;
  return -1;
}

function filterByQuery(list: Country[], q: string): Country[] {
  if (!q) return list;
  return list
    .map((c) => ({ c, rank: matchRank(c.name, q) }))
    .filter((s) => s.rank >= 0)
    .sort((a, b) => a.rank - b.rank)
    .map((s) => s.c);
}

function Chip({ country, index, disabled, month, scope, homeCountry, onPick }: { country: Country; index: number; disabled?: boolean; month?: string | null; scope: TripScope; homeCountry?: string; onPick: () => void }) {
  const fit = month ? monthFit(country, month) : "neutral";
  const cue = monthCue(fit, month ?? null);
  return (
    <button
      onClick={onPick}
      disabled={disabled}
      style={{ animationDelay: `${Math.min(index, 14) * 25}ms` }}
      className={`${CHIP_BASE} ${fit === "avoid" ? CHIP_TONE_AVOID : CHIP_TONE_DEFAULT}`}
    >
      <span aria-hidden="true" className="text-base leading-none">{unitFlag(country.name, scope, homeCountry)}</span>
      <span className="truncate">{country.name}</span>
      {cue && (
        <span className="text-xs leading-none" title={cue.label} aria-label={cue.label} role="img">{cue.icon}</span>
      )}
    </button>
  );
}

/**
 * Inline month lens — collapses the old 12-pill row into a single dropdown that
 * reuses {@link PlanPopover} (anchored popover on desktop / bottom-sheet on
 * mobile, portaled so it's never clipped, Escape-to-close). Picking a month
 * re-ranks the board by seasonality; "Any month" clears the lens.
 */
function MonthPicker({ month, onChange }: { month: string | null; onChange: (m: string | null) => void }) {
  return (
    <PlanPopover
      title="When are you going?"
      icon="📅"
      subtitle="Sorts destinations by season"
      haspopup="listbox"
      minWidth={260}
      triggerAriaLabel={month ? `Travel month: ${expandMonth(month)}. Change month` : "Choose travel month"}
      triggerClassName="focus-ring-emerald flex min-h-[46px] shrink-0 items-center gap-1.5 rounded-2xl border border-line bg-white px-3.5 text-[13px] font-semibold text-ink-1 shadow-[0_1px_3px_rgba(20,40,30,0.05)] transition-colors hover:border-emerald-600 hover:text-emerald-800"
      triggerLabel={
        <>
          <span aria-hidden="true">📅</span>
          <span className={`w-[2.25rem] text-left tabular-nums ${month ? "text-emerald-800" : "text-ink-2"}`}>{month ?? "Any"}</span>
          <span aria-hidden="true" className="text-[10px] text-ink-4">▾</span>
        </>
      }
    >
      {(close) => (
        <div className="w-full">
          <div className="grid grid-cols-4 gap-1.5">
            {MONTHS.map((m) => {
              const active = month === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => { onChange(active ? null : m); close(); }}
                  aria-pressed={active}
                  aria-label={expandMonth(m)}
                  className={`focus-ring-emerald min-h-[40px] rounded-xl border text-[12px] font-semibold transition-colors ${
                    active
                      ? "border-emerald-600 bg-emerald-700 text-white"
                      : "border-line bg-white text-ink-2 hover:border-emerald-600 hover:text-emerald-800"
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
          {month && (
            <button
              type="button"
              onClick={() => { onChange(null); close(); }}
              className="focus-ring-emerald mt-2.5 w-full rounded-xl px-3 py-2 text-center text-[12px] font-semibold text-emerald-800 transition-colors hover:bg-emerald-50"
            >
              Any month
            </button>
          )}
        </div>
      )}
    </PlanPopover>
  );
}

/**
 * Empty-state "Where next?" — an editorial hero over a fast search across a
 * popularity-ranked destination board. "Jump back in" surfaces the destinations
 * you recently planned (most-recent first); a region tab strip and an inline
 * month lens fold in browse-by-region and seasonality without burying the board.
 */
export default function DestinationPicker({ source, countries, exploreCountries, onStart, multiSelect = false, maxSelection = MAX_TRIP_UNITS, showScopeToggle = false, onScopeChange, homeCountry }: Props) {
  const [query, setQuery] = useState("");
  const [showAllMine, setShowAllMine] = useState(false);
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [month, setMonth] = useState<string | null>(null);
  const [region, setRegion] = useState<string>("All");
  const q = query.trim().toLowerCase();

  // Name → Country lookup across both tiers, so the tray can resolve selections
  // (which are stored as names) back to full countries when starting the trip.
  const byName = useMemo(() => {
    const map = new Map<string, Country>();
    for (const c of [...countries, ...exploreCountries]) map.set(c.name, c);
    return map;
  }, [countries, exploreCountries]);

  const selectedSet = useMemo(() => new Set(selectedNames), [selectedNames]);
  const atCap = selectedNames.length >= maxSelection;

  // Region tabs are derived from whatever the active scope actually offers, so
  // the strip is scope-agnostic: International shows world regions in a familiar
  // order; Domestic (India) shows its own regions (North/South India, …). "All"
  // is always first; unknown regions keep their first-seen order after the known
  // ones. The strip hides itself when a scope has fewer than two regions.
  const regions = useMemo(() => {
    const present = new Set<string>();
    for (const c of exploreCountries) if (c.region) present.add(c.region);
    const ordered = [
      ...INTL_REGION_ORDER.filter((r) => present.has(r)),
      ...[...present].filter((r) => !INTL_REGION_ORDER.includes(r)),
    ];
    return ["All", ...ordered];
  }, [exploreCountries]);
  // A scope switch can leave the previously-picked region absent; fall back to All.
  useEffect(() => {
    if (!regions.includes(region)) setRegion("All");
  }, [regions, region]);

  // A chip tap starts the trip immediately in single-select mode; in multi-select
  // it toggles the country in the selection, which is confirmed with the Go arrow.
  const pickCountry = (c: Country) => {
    if (!multiSelect) { onStart([c]); return; }
    setSelectedNames((prev) => toggleTripSelection(prev, c.name, maxSelection));
  };

  const startTrip = () => {
    const chosen = selectedNames
      .map((n) => byName.get(n) ?? source.resolveUnit(n))
      .filter((c): c is Country => c !== null && c !== undefined);
    if (chosen.length > 0) onStart(chosen);
  };

  // Your list: the destinations you recently planned, most-recent first (the
  // `countries` prop already arrives in MRU order from the store).
  const mine = countries;

  // In multi-select, a chosen country lives in the token field — so it's dropped
  // from the browse grids below to avoid echoing the same option twice.
  const mineFiltered = useMemo(() => {
    const list = filterByQuery(mine, q);
    const scoped = multiSelect ? list.filter((c) => !selectedSet.has(c.name)) : list;
    return rankByMonthFit(scoped, month);
  }, [mine, q, multiSelect, selectedSet, month]);
  const exploreFiltered = useMemo(() => {
    let list = filterByQuery(exploreCountries, q);
    if (region !== "All") list = list.filter((c) => c.region === region);
    if (multiSelect) list = list.filter((c) => !selectedSet.has(c.name));
    list = rankByMonthFit(list, month);
    // Any active lens (search / region browse) reveals the full set; the pristine
    // popularity board (optionally month-ranked) stays capped to a tidy preview.
    return q || region !== "All" ? list : list.slice(0, EXPLORE_LIMIT);
  }, [exploreCountries, q, region, multiSelect, selectedSet, month]);

  // Cap the list on the pristine hero view; search or "show all" reveals everything.
  const mineCapped = q || showAllMine ? mineFiltered : mineFiltered.slice(0, MINE_LIMIT);
  const mineHidden = mineFiltered.length - mineCapped.length;

  // Contextual "pairs well with" suggestions — the combo targets of the chosen
  // countries, resolved to full seeds. Only surfaced mid-selection (multi-select,
  // at least one pick, room to spare) to guide a great multi-country route.
  const recommendations = useMemo(() => {
    if (!multiSelect || selectedNames.length === 0 || atCap || q) return [];
    return source.comboRecommendations(selectedNames, selectedSet)
      .map((c) => byName.get(c.name) ?? c)
      .slice(0, EXPLORE_LIMIT);
  }, [multiSelect, selectedNames, selectedSet, atCap, q, byName, source]);

  const nothing = mineFiltered.length === 0 && exploreFiltered.length === 0;

  return (
    <div className="h-full w-full overflow-y-auto bg-surface-2">
      <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-5 pt-6 pb-12 lg:max-w-5xl lg:px-8">
        {/* Editorial hero — sets tone on every breakpoint without burying the board. */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-700 via-emerald-800 to-emerald-900 px-5 py-5 shadow-sm sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <span aria-hidden="true" className="pointer-events-none absolute -right-3 -top-5 select-none text-[86px] leading-none opacity-20 lg:text-[120px]">🌍</span>
          <p className="relative text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200">Plan your next escape</p>
          <h1 className="relative mt-1 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl">
            {multiSelect ? "Where will your journey take you?" : "Where will you wander next?"}
          </h1>
          <p className="relative mt-1.5 max-w-md text-[13px] text-emerald-100/90 lg:text-sm">
            {multiSelect
              ? `Pick up to ${maxSelection} ${source.unitNounPlural} and we'll shape one trip across them.`
              : "Pick a destination and we'll shape a trip around what you love."}
          </p>
          {showScopeToggle && onScopeChange && (
            <ScopeToggle scope={source.scope} onChange={onScopeChange} homeCountry={homeCountry ?? "home"} />
          )}
        </div>

        <div className="mt-4 space-y-2.5">
          <div className="focus-within:border-emerald-600 focus-within:shadow-[0_0_0_3px_rgba(4,120,87,0.12)] flex min-w-0 items-end gap-2 rounded-2xl border border-line bg-white px-3 py-2.5 shadow-[0_1px_3px_rgba(20,40,30,0.05)] transition-[border-color,box-shadow] sm:items-center">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
              {multiSelect && selectedNames.map((name) => {
                const fit = month ? monthFit(byName.get(name) ?? { bestMonths: [], worstMonths: [] }, month) : "neutral";
                const cue = monthCue(fit, month);
                const avoid = fit === "avoid";
                return (
                  <span
                    key={name}
                    className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-full border py-0.5 pl-2.5 pr-1 text-sm font-medium ${avoid ? TOKEN_TONE_AVOID : TOKEN_TONE_DEFAULT}`}
                  >
                    <span aria-hidden="true">{unitFlag(name, source.scope, homeCountry)}</span>
                    <span className="max-w-[8rem] truncate">{name}</span>
                    {cue && (
                      <span className="text-[11px] leading-none" title={cue.label} aria-label={cue.label} role="img">{cue.icon}</span>
                    )}
                    <button
                      onClick={() => setSelectedNames((prev) => prev.filter((n) => n !== name))}
                      aria-label={`Remove ${name}`}
                      className={`focus-ring-emerald flex h-5 w-5 items-center justify-center rounded-full text-xs transition-colors ${avoid ? TOKEN_REMOVE_AVOID : TOKEN_REMOVE_DEFAULT}`}
                    >
                      ✕
                    </button>
                  </span>
                );
              })}
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (multiSelect && e.key === "Backspace" && query === "" && selectedNames.length > 0) {
                    setSelectedNames((prev) => prev.slice(0, -1));
                  }
                }}
                placeholder={multiSelect && selectedNames.length > 0 ? "Add another…" : "Search destinations…"}
                aria-label="Search destinations"
                className="min-w-[7rem] flex-1 bg-transparent py-1.5 text-[15px] text-ink-1 outline-none placeholder:text-ink-4"
                autoFocus={prefersAutoFocus()}
              />
            </div>
            {multiSelect && selectedNames.length > 0 && (
              <button
                onClick={startTrip}
                aria-label={`Plan trip with ${selectedNames.length} ${selectedNames.length === 1 ? source.unitNoun : source.unitNounPlural}`}
                className="focus-ring-emerald flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm transition-[transform,background-color,box-shadow] hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md motion-safe:animate-[fadeInUp_0.2s_ease-out]"
              >
                <span aria-hidden="true" className="text-xl leading-none">→</span>
              </button>
            )}
          </div>
          {/* Secondary controls sit on their own row so the growing token field
              never has to height-match the compact month lens (fixed the
              mismatched side-by-side boxes on desktop + mobile). */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <MonthPicker month={month} onChange={setMonth} />
            {multiSelect && selectedNames.length > 0 && (
              <p className="text-[11px] font-medium text-ink-4" aria-live="polite">
                {selectedNames.length}/{maxSelection} selected{atCap ? " · max reached" : " · tap the arrow when ready"}
              </p>
            )}
          </div>
          {month && (
            <p className="text-[11px] text-ink-2" aria-live="polite">
              Sorted for <span className="font-semibold text-emerald-800">{expandMonth(month)}</span> — ☀️ great · ⚠️ off-season.
            </p>
          )}

          {/* Region browse — one swipeable strip of toggle buttons (folds in
              Discover's by-region). Styled like tabs but semantically buttons:
              there's no tabpanel below, so `role="tab"` would mislead SRs.
              Hidden when the scope has no meaningful region split. */}
          {regions.length > 1 && (
          <div
            role="group"
            aria-label="Browse destinations by region"
            className="mt-3 flex gap-4 overflow-x-auto border-b border-line [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {regions.map((r) => {
              const active = region === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRegion(r)}
                  aria-pressed={active}
                  className={`focus-ring-emerald shrink-0 whitespace-nowrap border-b-2 px-1 py-2 text-[12.5px] font-bold transition-colors ${
                    active
                      ? "border-emerald-700 text-emerald-800"
                      : "border-transparent text-ink-4 hover:text-emerald-800"
                  }`}
                >
                  {r === "All" ? "Popular" : r}
                </button>
              );
            })}
          </div>
          )}
        </div>

        {countries.length === 0 && !q && selectedNames.length === 0 && (
          <p className="mt-4 text-center text-xs text-ink-2">
            Search a destination above, or browse by region, to start planning.
          </p>
        )}

        {recommendations.length > 0 && (
          <section className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 motion-safe:animate-[fadeInUp_0.28s_ease-out]">
            <h2 className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-800">
              <span aria-hidden="true">✨</span>
              {selectedNames.length === 1 ? `Pairs well with ${selectedNames[0]}` : "Great additions to your trip"}
            </h2>
            <p className="mb-3 text-[11px] text-emerald-700/80">Travellers often combine these into one seamless route.</p>
            <div className="flex flex-wrap gap-2.5">
              {recommendations.map((c, i) => (
                <Chip key={c.name} country={c} index={i} month={month} scope={source.scope} homeCountry={homeCountry} onPick={() => pickCountry(c)} />
              ))}
            </div>
          </section>
        )}

        {mineCapped.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-ink-4">Jump back in</h2>
            <div className="flex flex-wrap gap-2.5">
              {mineCapped.map((c, i) => (
                <Chip key={c.name} country={c} index={i} month={month} scope={source.scope} homeCountry={homeCountry} disabled={multiSelect && atCap} onPick={() => pickCountry(c)} />
              ))}
              {mineHidden > 0 && (
                <button
                  onClick={() => setShowAllMine(true)}
                  className="focus-ring-emerald min-h-[44px] rounded-full border border-dashed border-line-strong px-4 py-2.5 text-sm font-medium text-ink-2 transition-colors hover:border-emerald-600 hover:text-emerald-800"
                >
                  Show all {mineFiltered.length}
                </button>
              )}
              {showAllMine && !q && mineFiltered.length > MINE_LIMIT && (
                <button
                  onClick={() => setShowAllMine(false)}
                  className="focus-ring-emerald min-h-[44px] rounded-full px-4 py-2.5 text-sm font-medium text-ink-2 transition-colors hover:text-emerald-800"
                >
                  Show less
                </button>
              )}
            </div>
          </section>
        )}

        {exploreFiltered.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-ink-4">
              {month && region !== "All"
                ? `Best in ${expandMonth(month)} · ${region}`
                : month
                  ? `Best in ${expandMonth(month)}`
                  : region !== "All"
                    ? `Explore ${region}`
                    : q
                      ? "More destinations"
                      : "Popular to explore"}
            </h2>
            <div className="flex flex-wrap gap-2.5">
              {exploreFiltered.map((c, i) => (
                <Chip key={c.name} country={c} index={i} month={month} scope={source.scope} homeCountry={homeCountry} disabled={multiSelect && atCap} onPick={() => pickCountry(c)} />
              ))}
            </div>
          </section>
        )}

        {nothing && (
          <p className="mt-10 text-center text-sm text-ink-2">
            No destination matches “{query}”. Try a different name or region.
          </p>
        )}
      </div>
    </div>
  );
}
