import { useMemo, useState } from "react";
import type { Country } from "@/core/types";
import type { DestinationSource } from "@/core/trip/destinationSource";
import { getCountryFlag } from "@/utils/countryFlags";
import { MAX_TRIP_UNITS, toggleTripSelection } from "@/core/utils/multiCountry";
import { MONTHS, expandMonth } from "@/core/utils/months";
import { monthFit, rankByMonthFit } from "@/core/utils/monthFit";

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
};

const EXPLORE_LIMIT = 12;
const MINE_LIMIT = 8;

/** Sovereign-catalog regions, "All" first — folds Discover's browse-by-region into Plan. */
const REGIONS = ["All", "Asia", "Europe", "Middle East", "Africa", "Americas", "Oceania"] as const;

const CHIP_BASE =
  "focus-ring-emerald group inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2.5 text-sm shadow-[0_1px_2px_rgba(20,40,30,0.05)] transition-[transform,box-shadow,border-color,color] motion-safe:animate-[fadeInUp_0.28s_ease-out_both] hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-[0_1px_2px_rgba(20,40,30,0.05)]";
const CHIP_TONE_DEFAULT = "border-line bg-white font-medium text-ink-1 hover:border-emerald-600 hover:text-emerald-800";
const CHIP_TONE_AVOID = "border-amber-200 bg-amber-50/40 font-medium text-ink-2 hover:border-amber-400 hover:text-amber-800";

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

function Chip({ country, index, disabled, month, onPick }: { country: Country; index: number; disabled?: boolean; month?: string | null; onPick: () => void }) {
  const fit = month ? monthFit(country, month) : "neutral";
  const cue = fit === "best" ? "☀️" : fit === "avoid" ? "⚠️" : null;
  const cueLabel = fit === "best" ? `great in ${expandMonth(month!)}` : fit === "avoid" ? `avoid ${expandMonth(month!)}` : "";
  return (
    <button
      onClick={onPick}
      disabled={disabled}
      style={{ animationDelay: `${Math.min(index, 14) * 25}ms` }}
      className={`${CHIP_BASE} ${fit === "avoid" ? CHIP_TONE_AVOID : CHIP_TONE_DEFAULT}`}
    >
      <span aria-hidden="true" className="text-base leading-none">{getCountryFlag(country.name)}</span>
      <span className="truncate">{country.name}</span>
      {cue && (
        <span className="text-xs leading-none" title={cueLabel} aria-label={cueLabel} role="img">{cue}</span>
      )}
    </button>
  );
}

/**
 * Empty-state "Where next?" — a fast search over a popularity-ranked destination
 * board. Your list surfaces the destinations you recently planned (most-recent
 * first), then popular rule-backed destinations to explore. A month "When?"
 * filter re-ranks by seasonality and a region filter folds in browse-by-region.
 */
export default function DestinationPicker({ source, countries, exploreCountries, onStart, multiSelect = false, maxSelection = MAX_TRIP_UNITS }: Props) {
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
      <div className={`mx-auto flex min-h-full w-full max-w-2xl flex-col px-5 pt-12 pb-12 ${q ? "" : "justify-center"}`}>
        <div className="text-center">
          <div className="mb-3 text-3xl opacity-80" aria-hidden="true">🧭</div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-1 sm:text-4xl">
            Where do you plan to go next?
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-ink-2">
            {multiSelect
              ? "Pick up to " + maxSelection + " " + source.unitNounPlural + " and we'll shape one trip across them."
              : "Pick a destination and we'll shape a trip around what you love."}
          </p>
        </div>

        <div className="mt-8">
          <div className="focus-within:border-emerald-600 focus-within:shadow-[0_0_0_3px_rgba(4,120,87,0.12)] flex items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2.5 shadow-[0_1px_3px_rgba(20,40,30,0.05)] transition-[border-color,box-shadow]">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
              {multiSelect && selectedNames.map((name) => (
                <span key={name} className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 py-0.5 pl-2.5 pr-1 text-sm font-medium text-emerald-800">
                  <span aria-hidden="true">{getCountryFlag(name)}</span>
                  <span className="max-w-[8rem] truncate">{name}</span>
                  <button
                    onClick={() => setSelectedNames((prev) => prev.filter((n) => n !== name))}
                    aria-label={`Remove ${name}`}
                    className="focus-ring-emerald flex h-5 w-5 items-center justify-center rounded-full text-xs text-emerald-500 transition-colors hover:bg-emerald-100 hover:text-emerald-700"
                  >
                    ✕
                  </button>
                </span>
              ))}
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
          {multiSelect && selectedNames.length > 0 && (
            <p className="mt-2 text-center text-[11px] font-medium text-ink-4" aria-live="polite">
              {selectedNames.length}/{maxSelection} selected{atCap ? " · max reached" : " · tap the arrow when ready"}
            </p>
          )}

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-4">When are you going?</span>
              {month && (
                <button
                  onClick={() => setMonth(null)}
                  className="focus-ring-emerald rounded-full px-2 py-0.5 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 hover:underline"
                >
                  Any month
                </button>
              )}
            </div>
            <div role="group" aria-label="Filter destinations by travel month" className="flex flex-wrap justify-center gap-1.5">
              {MONTHS.map((m) => {
                const active = month === m;
                return (
                  <button
                    key={m}
                    onClick={() => setMonth((cur) => (cur === m ? null : m))}
                    aria-pressed={active}
                    aria-label={`${expandMonth(m)}${active ? " (selected)" : ""}`}
                    className={`focus-ring-emerald min-h-[32px] min-w-[44px] rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
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
              <p className="mt-2 text-center text-[11px] text-ink-2" aria-live="polite">
                Sorted for <span className="font-semibold text-emerald-800">{expandMonth(month)}</span> — ☀️ great · ⚠️ off-season.
              </p>
            )}

            <div className="mt-3 flex flex-wrap justify-center gap-1.5" role="group" aria-label="Browse destinations by region">
              {REGIONS.map((r) => {
                const active = region === r;
                return (
                  <button
                    key={r}
                    onClick={() => setRegion(r)}
                    aria-pressed={active}
                    className={`focus-ring-emerald min-h-[32px] rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
                      active
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                        : "border-line bg-white text-ink-2 hover:border-emerald-600 hover:text-emerald-800"
                    }`}
                  >
                    {r === "All" ? "🌍 All regions" : r}
                  </button>
                );
              })}
            </div>
          </div>
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
                <Chip key={c.name} country={c} index={i} month={month} onPick={() => pickCountry(c)} />
              ))}
            </div>
          </section>
        )}

        {mineCapped.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-ink-4">Jump back in</h2>
            <div className="flex flex-wrap gap-2.5">
              {mineCapped.map((c, i) => (
                <Chip key={c.name} country={c} index={i} month={month} disabled={multiSelect && atCap} onPick={() => pickCountry(c)} />
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
                <Chip key={c.name} country={c} index={i} month={month} disabled={multiSelect && atCap} onPick={() => pickCountry(c)} />
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
