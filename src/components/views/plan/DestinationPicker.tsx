import { useMemo, useState } from "react";
import type { Country } from "../../../core/types";
import { byPopularity } from "../../../core/data/popularDestinations";
import { getCountryFlag } from "../../../utils/countryFlags";

type Props = {
  /** The user's My List destinations. */
  countries: Country[];
  /** Plannable destinations NOT in My List, most popular first. */
  exploreCountries: Country[];
  visitedNames: Set<string>;
  onPick: (country: Country) => void;
  onGoDiscover: () => void;
};

const EXPLORE_LIMIT = 12;
const MINE_LIMIT = 8;

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

function Chip({ country, visited, index, onPick }: { country: Country; visited?: boolean; index: number; onPick: () => void }) {
  return (
    <button
      onClick={onPick}
      style={{ animationDelay: `${Math.min(index, 14) * 25}ms` }}
      className={`focus-ring-emerald group inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2.5 text-sm shadow-[0_1px_2px_rgba(20,40,30,0.05)] transition-[transform,box-shadow,border-color,color] motion-safe:animate-[fadeInUp_0.28s_ease-out_both] hover:-translate-y-0.5 hover:shadow-md ${
        visited
          ? "border-[#e6e1d4] bg-[#f4f1e8] text-[#a39d8c] hover:border-[#cfc9b8]"
          : "border-[#e4dece] bg-white font-medium text-[#1e2a25] hover:border-emerald-600 hover:text-emerald-800"
      }`}
    >
      <span aria-hidden="true" className="text-base leading-none">{getCountryFlag(country.name)}</span>
      <span className="truncate">{country.name}</span>
      {visited && <span aria-hidden="true" className="text-emerald-700/60">✓</span>}
    </button>
  );
}

/**
 * Empty-state "Where next?" — a fast search over a popularity-ranked destination
 * board. Your list comes first (unvisited before visited), then popular rule-backed
 * destinations to explore. Routes to Discover when nothing matches.
 */
export default function DestinationPicker({ countries, exploreCountries, visitedNames, onPick, onGoDiscover }: Props) {
  const [query, setQuery] = useState("");
  const [showAllMine, setShowAllMine] = useState(false);
  const q = query.trim().toLowerCase();

  // Your list: unvisited first, each group most-popular first.
  const mine = useMemo(() => {
    const unvisited = countries.filter((c) => !visitedNames.has(c.name)).sort(byPopularity);
    const visited = countries.filter((c) => visitedNames.has(c.name)).sort(byPopularity);
    return [...unvisited, ...visited];
  }, [countries, visitedNames]);

  const mineFiltered = useMemo(() => filterByQuery(mine, q), [mine, q]);
  const exploreFiltered = useMemo(() => {
    const filtered = filterByQuery(exploreCountries, q);
    return q ? filtered : filtered.slice(0, EXPLORE_LIMIT);
  }, [exploreCountries, q]);

  // Cap the list on the pristine hero view; search or "show all" reveals everything.
  const mineCapped = q || showAllMine ? mineFiltered : mineFiltered.slice(0, MINE_LIMIT);
  const mineHidden = mineFiltered.length - mineCapped.length;

  const nothing = mineFiltered.length === 0 && exploreFiltered.length === 0;

  return (
    <div className="h-full w-full overflow-y-auto bg-[#f7f4ec]">
      <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-center px-5 py-12">
        <div className="text-center">
          <div className="mb-3 text-3xl opacity-80" aria-hidden="true">🧭</div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[#16241d] sm:text-4xl">
            Where do you plan to go next?
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-[#6f6a5d]">
            Pick a destination and we'll shape a trip around what you love.
          </p>
        </div>

        <div className="relative mt-8">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search destinations…"
            aria-label="Search destinations"
            className="focus-ring-emerald w-full rounded-2xl border border-[#e4dece] bg-white px-5 py-4 text-[15px] text-[#1e2a25] shadow-[0_1px_3px_rgba(20,40,30,0.05)] outline-none transition-[border-color,box-shadow] placeholder:text-[#a8a293] focus:border-emerald-600 focus:shadow-[0_0_0_3px_rgba(4,120,87,0.12)]"
            autoFocus
          />
        </div>

        {countries.length === 0 && !q && (
          <p className="mt-4 text-center text-xs text-[#6f6a5d]">
            Your list is empty — plan any popular destination below, or{" "}
            <button onClick={onGoDiscover} className="focus-ring-emerald rounded font-semibold text-emerald-700 hover:underline">
              browse Discover
            </button>
            .
          </p>
        )}

        {mineCapped.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#a09a89]">From your list</h2>
            <div className="flex flex-wrap gap-2.5">
              {mineCapped.map((c, i) => (
                <Chip key={c.name} country={c} index={i} visited={visitedNames.has(c.name)} onPick={() => onPick(c)} />
              ))}
              {mineHidden > 0 && (
                <button
                  onClick={() => setShowAllMine(true)}
                  className="focus-ring-emerald min-h-[44px] rounded-full border border-dashed border-[#cfc9b8] px-4 py-2.5 text-sm font-medium text-[#6f6a5d] transition-colors hover:border-emerald-600 hover:text-emerald-800"
                >
                  Show all {mineFiltered.length}
                </button>
              )}
              {showAllMine && !q && mineFiltered.length > MINE_LIMIT && (
                <button
                  onClick={() => setShowAllMine(false)}
                  className="focus-ring-emerald min-h-[44px] rounded-full px-4 py-2.5 text-sm font-medium text-[#6f6a5d] transition-colors hover:text-emerald-800"
                >
                  Show less
                </button>
              )}
            </div>
          </section>
        )}

        {exploreFiltered.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#a09a89]">
              {q ? "More destinations" : "Popular to explore"}
            </h2>
            <div className="flex flex-wrap gap-2.5">
              {exploreFiltered.map((c, i) => (
                <Chip key={c.name} country={c} index={i} onPick={() => onPick(c)} />
              ))}
            </div>
          </section>
        )}

        {nothing && (
          <p className="mt-10 text-center text-sm text-[#6f6a5d]">
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
