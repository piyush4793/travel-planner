import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CatalogEntry } from "../../core/types";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { getCountryFlag } from "../../utils/countryFlags";
import { MAX_TRIP_UNITS, toggleTripSelection } from "../../core/utils/multiCountry";

type Props = {
  catalog: CatalogEntry[];
  /** Start a plan from a picked destination set (routes into the Plan wizard). */
  onPlanTrip: (names: string[]) => void;
};

const REGIONS = ["All", "Asia", "Europe", "Middle East", "Africa", "Americas", "Oceania"];

/* Region → left border color for cards */
const REGION_COLORS: Record<string, string> = {
  Asia: "border-l-amber-400",
  Europe: "border-l-blue-400",
  "Middle East": "border-l-orange-400",
  Africa: "border-l-yellow-600",
  Americas: "border-l-indigo-400",
  Oceania: "border-l-teal-400",
};

/**
 * Discover — a browse-by-region board over the sovereign catalog. Pure
 * discovery → plan: tap a destination to start a single-country plan, or gather
 * up to {@link MAX_TRIP_UNITS} into the tray for a multi-country route. There is
 * no "My List" bookkeeping here — the implicit recents ledger is written when a
 * trip actually enters the Plan wizard.
 */
export default function DiscoverView({ catalog, onPlanTrip }: Props) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 200);
  }, []);

  // Clear debounce timer on unmount
  useEffect(() => () => clearTimeout(debounceRef.current), []);
  const [region, setRegion] = useState("All");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);
  const regionPopRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isDesktop = bp === "desktop";

  // Outside-click + Escape for popovers
  useEffect(() => {
    if (!regionOpen && !filtersOpen) return;
    const handler = (e: MouseEvent) => {
      if (regionOpen && regionPopRef.current && !regionPopRef.current.contains(e.target as Node)) setRegionOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setRegionOpen(false); setFiltersOpen(false); }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("keydown", esc); };
  }, [regionOpen, filtersOpen]);

  // Scroll-to-top visibility
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setShowScrollTop(el.scrollTop > 300);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const filtered = useMemo(() => {
    let result = catalog;
    if (region !== "All") result = result.filter((c) => c.region === region);
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(q));
    }
    return [...result].sort((a, b) => a.name.localeCompare(b.name));
  }, [catalog, region, debouncedSearch]);

  const hasFilters = search !== "" || region !== "All";

  const clearAll = () => {
    setSearch(""); setDebouncedSearch(""); clearTimeout(debounceRef.current);
    setRegion("All");
  };

  /* ── Plan-trip intake: pick destinations → start a Plan (routes to #plan) ── */
  const [tripSelection, setTripSelection] = useState<string[]>([]);
  const tripFull = tripSelection.length >= MAX_TRIP_UNITS;
  const toggleTrip = useCallback((name: string) => {
    setTripSelection((prev) => toggleTripSelection(prev, name));
  }, []);
  const startTrip = useCallback(() => {
    if (tripSelection.length === 0) return;
    onPlanTrip(tripSelection);
    setTripSelection([]);
  }, [tripSelection, onPlanTrip]);

  /* ── Region grid (mobile panel) ── */
  const regionGrid = (
    <div className="grid grid-cols-3 gap-1.5">
      {REGIONS.map((r) => (
        <button
          key={r}
          onClick={() => setRegion(r)}
          className={`py-2 px-2.5 min-h-[32px] rounded-lg text-[10px] font-semibold transition-colors focus-ring ${
            region === r
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {r === "All" ? "🌍 All" : r}
        </button>
      ))}
    </div>
  );

  return (
    <div className="relative h-full flex flex-col bg-gradient-to-b from-slate-50 to-white overflow-hidden">
      {/* Screen reader live region */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        Showing {filtered.length} of {catalog.length} countries
      </div>

      {/* ─── MOBILE HEADER ─── */}
      {isMobile && (
        <div className="border-b bg-white shrink-0 px-3 py-2 space-y-2">
          {/* Search row */}
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search countries…"
                  aria-label="Search countries"
                  className="w-full px-2.5 py-1.5 pl-8 pr-8 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-300 focus:outline-none transition-colors h-8"
                />
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {search && (
                  <button onClick={() => { setSearch(""); setDebouncedSearch(""); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm p-0.5 focus-ring rounded" aria-label="Clear search">✕</button>
                )}
              </div>
            </div>
            <button
              onClick={() => setFiltersOpen((o) => !o)}
              className={`flex items-center justify-center w-8 h-8 rounded-lg border text-xs focus-ring ${
                filtersOpen || hasFilters ? "bg-blue-50 text-blue-700 border-blue-200" : "text-gray-500 border-gray-200 hover:bg-gray-100"
              }`}
              aria-label="Filters"
              aria-expanded={filtersOpen}
              aria-controls="discover-filters-mobile"
            >
              🎚️
            </button>
          </div>

          {/* Expandable filter panel */}
          {filtersOpen && (
            <div id="discover-filters-mobile" role="region" aria-label="Filters" className="rounded-xl border border-gray-200 bg-gray-50 p-2.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Filters</p>
                {hasFilters && (
                  <button onClick={clearAll} className="text-[10px] font-semibold text-red-600 focus-ring rounded px-1">Clear</button>
                )}
              </div>
              <div>
                <p className="text-[10px] text-gray-400 mb-1">Region</p>
                {regionGrid}
              </div>
            </div>
          )}

          {/* Summary line */}
          <p className="text-[10px] text-gray-400">
            {filtered.length} of {catalog.length} destinations
          </p>
        </div>
      )}

      {/* ─── DESKTOP / TABLET TOOLBAR ─── */}
      {!isMobile && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200/80 bg-white shrink-0">
          {/* Search */}
          <div className="relative w-52">
            <input
              type="text" value={search} onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search countries…" aria-label="Search countries"
              className="w-full px-2.5 py-1.5 pl-8 pr-7 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-300 focus:outline-none transition-colors"
            />
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {search && (
              <button onClick={() => { setSearch(""); setDebouncedSearch(""); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs focus-ring rounded" aria-label="Clear search">✕</button>
            )}
          </div>

          {/* Region chip + popover */}
          <div className="relative" ref={regionPopRef}>
            <button
              onClick={() => setRegionOpen((o) => !o)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors focus-ring ${
                region !== "All" ? "bg-blue-50 text-blue-700 border-blue-200" : "text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
              aria-expanded={regionOpen}
              aria-haspopup="true"
              aria-controls="discover-region-pop"
            >
              {region === "All" ? "Region" : region}
              <svg className={`w-3 h-3 transition-transform ${regionOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
            {regionOpen && (
              <div id="discover-region-pop" aria-label="Region" className="absolute top-full left-0 mt-1 z-50 w-48 rounded-xl border border-gray-200 bg-white shadow-lg p-2 space-y-0.5">
                {REGIONS.map((r) => (
                  <button key={r} onClick={() => { setRegion(r); setRegionOpen(false); }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors focus-ring ${region === r ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-600 hover:bg-gray-50"}`}
                  >{r === "All" ? "🌍 All Regions" : r}</button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1" />

          {hasFilters && (
            <button onClick={clearAll} className="text-[10px] text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors focus-ring">
              Clear
            </button>
          )}

          <p className="text-[10px] text-gray-400 tabular-nums">
            Showing {filtered.length}
          </p>
        </div>
      )}

      {/* ─── COUNTRY GRID ─── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 md:px-5 pt-4 pb-safe">
        <div className={`grid gap-2.5 max-w-6xl mx-auto ${
          isMobile ? "grid-cols-2" : isDesktop ? "grid-cols-4 lg:grid-cols-5" : "grid-cols-3"
        }`}>
          {filtered.map((entry) => {
            const inTrip = tripSelection.includes(entry.name);
            const borderColor = REGION_COLORS[entry.region] ?? "border-l-gray-300";
            return (
              <div
                key={entry.name}
                className={`group rounded-xl border border-l-[3px] ${borderColor} p-3 transition ${
                  inTrip
                    ? "bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300"
                    : "bg-white border-gray-200 hover:border-emerald-200 hover:shadow-md hover:-translate-y-0.5"
                }`}
              >
                <div className="flex items-start justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-base leading-none shrink-0">{getCountryFlag(entry.name)}</span>
                    <span className={`font-bold leading-tight truncate ${isMobile ? "text-[11px]" : "text-xs"} text-gray-800`}>
                      {entry.name}
                    </span>
                  </div>
                </div>
                <span className="text-[9px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded inline-block mb-2">
                  {entry.region}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onPlanTrip([entry.name])}
                    aria-label={`Plan a trip to ${entry.name}`}
                    className="flex-1 min-h-[32px] rounded-lg text-[10px] font-bold bg-emerald-700 text-white hover:bg-emerald-800 transition-colors focus-ring"
                  >
                    ▶ Plan
                  </button>
                  <button
                    onClick={() => toggleTrip(entry.name)}
                    disabled={!inTrip && tripFull}
                    aria-pressed={inTrip}
                    aria-label={inTrip ? `Remove ${entry.name} from trip` : `Add ${entry.name} to trip`}
                    className={`min-h-[32px] px-2 rounded-lg text-[10px] font-semibold transition-colors focus-ring disabled:opacity-40 disabled:cursor-not-allowed ${
                      inTrip
                        ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {inTrip ? "✓ Trip" : "＋ Trip"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-3">🗺️</p>
            <p className="font-semibold text-gray-500">No countries match</p>
            <p className="text-xs mt-1 mb-3">Try adjusting your search or filters</p>
            <button
              onClick={clearAll}
              className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors focus-ring"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Scroll-to-top FAB */}
      {showScrollTop && (
        <button
          onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 w-10 h-10 rounded-full bg-emerald-600 text-white shadow-lg flex items-center justify-center hover:bg-emerald-700 transition-colors focus-ring z-40"
          aria-label="Scroll to top"
        >
          ↑
        </button>
      )}

      {/* Plan-trip tray — appears when destinations are picked for a plan */}
      {tripSelection.length > 0 && (
        <div className="absolute inset-x-0 bottom-0 z-40 border-t border-emerald-200 bg-white/95 backdrop-blur px-3 md:px-5 py-2.5 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
          <div className="max-w-6xl mx-auto flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-emerald-900 truncate">
                {tripSelection.join(" → ")}
              </p>
              <p className="text-[10px] text-gray-500 tabular-nums">
                {tripSelection.length} of {MAX_TRIP_UNITS} · pick up to {MAX_TRIP_UNITS}
              </p>
            </div>
            <button
              onClick={() => setTripSelection([])}
              className="focus-ring min-h-[32px] px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={startTrip}
              className="focus-ring min-h-[36px] px-4 py-1.5 rounded-lg text-[12px] font-bold bg-emerald-700 text-white hover:bg-emerald-800 transition-colors"
            >
              Plan trip →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
