import { useMemo, useState } from "react";
import type { Country } from "@/core/types";
import type { DestinationSource } from "@/core/trip/destinationSource";
import { getCountryFlag } from "@/utils/countryFlags";
import { MAX_TRIP_UNITS, toggleTripSelection } from "@/core/utils/multiCountry";

type Props = {
  /** Scope data source — provides combo suggestions, unit nouns and resolution. */
  source: DestinationSource;
  /** Recently-planned destinations, most-recent first (implicit My List). */
  countries: Country[];
  /** Plannable destinations NOT recently planned, most popular first. */
  exploreCountries: Country[];
  /** Start the wizard with an ordered selection (1 unit = single-destination trip). */
  onStart: (countries: Country[]) => void;
  onGoDiscover: () => void;
  /** When true, chips accumulate into a multi-unit selection confirmed via a Go arrow. */
  multiSelect?: boolean;
  /** Max units per trip (multi-select only). */
  maxSelection?: number;
};

const EXPLORE_LIMIT = 12;
const MINE_LIMIT = 8;

const CHIP_BASE =
  "focus-ring-emerald group inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2.5 text-sm shadow-[0_1px_2px_rgba(20,40,30,0.05)] transition-[transform,box-shadow,border-color,color] motion-safe:animate-[fadeInUp_0.28s_ease-out_both] hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-[0_1px_2px_rgba(20,40,30,0.05)]";
const CHIP_TONE_DEFAULT = "border-line bg-white font-medium text-ink-1 hover:border-emerald-600 hover:text-emerald-800";

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

function Chip({ country, index, disabled, onPick }: { country: Country; index: number; disabled?: boolean; onPick: () => void }) {
  return (
    <button
      onClick={onPick}
      disabled={disabled}
      style={{ animationDelay: `${Math.min(index, 14) * 25}ms` }}
      className={`${CHIP_BASE} ${CHIP_TONE_DEFAULT}`}
    >
      <span aria-hidden="true" className="text-base leading-none">{getCountryFlag(country.name)}</span>
      <span className="truncate">{country.name}</span>
    </button>
  );
}

/**
 * Empty-state "Where next?" — a fast search over a popularity-ranked destination
 * board. Your list surfaces the destinations you recently planned (most-recent
 * first), then popular rule-backed destinations to explore. Routes to Discover
 * when nothing matches.
 */
export default function DestinationPicker({ source, countries, exploreCountries, onStart, onGoDiscover, multiSelect = false, maxSelection = MAX_TRIP_UNITS }: Props) {
  const [query, setQuery] = useState("");
  const [showAllMine, setShowAllMine] = useState(false);
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
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
    return multiSelect ? list.filter((c) => !selectedSet.has(c.name)) : list;
  }, [mine, q, multiSelect, selectedSet]);
  const exploreFiltered = useMemo(() => {
    let list = filterByQuery(exploreCountries, q);
    if (multiSelect) list = list.filter((c) => !selectedSet.has(c.name));
    return q ? list : list.slice(0, EXPLORE_LIMIT);
  }, [exploreCountries, q, multiSelect, selectedSet]);

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
        </div>

        {countries.length === 0 && !q && selectedNames.length === 0 && (
          <p className="mt-4 text-center text-xs text-ink-2">
            Search a destination above to start planning, or{" "}
            <button onClick={onGoDiscover} className="focus-ring-emerald rounded font-semibold text-emerald-700 hover:underline">
              browse Discover
            </button>
            .
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
                <Chip key={c.name} country={c} index={i} onPick={() => pickCountry(c)} />
              ))}
            </div>
          </section>
        )}

        {mineCapped.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-ink-4">Jump back in</h2>
            <div className="flex flex-wrap gap-2.5">
              {mineCapped.map((c, i) => (
                <Chip key={c.name} country={c} index={i} disabled={multiSelect && atCap} onPick={() => pickCountry(c)} />
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
              {q ? "More destinations" : "Popular to explore"}
            </h2>
            <div className="flex flex-wrap gap-2.5">
              {exploreFiltered.map((c, i) => (
                <Chip key={c.name} country={c} index={i} disabled={multiSelect && atCap} onPick={() => pickCountry(c)} />
              ))}
            </div>
          </section>
        )}

        {nothing && (
          <p className="mt-10 text-center text-sm text-ink-2">
            No destination matches “{query}”.{" "}
            <button onClick={onGoDiscover} className="focus-ring-emerald rounded font-semibold text-emerald-700 hover:underline">
              Browse Discover
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
