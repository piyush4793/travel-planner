import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CatalogEntry } from "../../core/types";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { getCountryFlag } from "../../utils/countryFlags";

type Props = {
  catalog: CatalogEntry[];
  myListNames: Set<string>;
  onAddToList: (name: string) => void;
  onRemoveFromList: (name: string) => void;
};

const REGIONS = ["All", "Asia", "Europe", "Middle East", "Africa", "Americas", "Oceania"];
type ListFilter = "all" | "in-list" | "not-in-list";

/* Region → left border color for cards */
const REGION_COLORS: Record<string, string> = {
  Asia: "border-l-amber-400",
  Europe: "border-l-blue-400",
  "Middle East": "border-l-orange-400",
  Africa: "border-l-yellow-600",
  Americas: "border-l-indigo-400",
  Oceania: "border-l-teal-400",
};




export default function DiscoverView({ catalog, myListNames, onAddToList, onRemoveFromList }: Props) {
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
  const [listFilter, setListFilter] = useState<ListFilter>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const regionPopRef = useRef<HTMLDivElement>(null);
  const statusPopRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isDesktop = bp === "desktop";

  // Outside-click + Escape for popovers
  useEffect(() => {
    if (!regionOpen && !statusOpen && !filtersOpen) return;
    const handler = (e: MouseEvent) => {
      if (regionOpen && regionPopRef.current && !regionPopRef.current.contains(e.target as Node)) setRegionOpen(false);
      if (statusOpen && statusPopRef.current && !statusPopRef.current.contains(e.target as Node)) setStatusOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setRegionOpen(false); setStatusOpen(false); setFiltersOpen(false); }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("keydown", esc); };
  }, [regionOpen, statusOpen, filtersOpen]);

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
    if (listFilter === "in-list") result = result.filter((c) => myListNames.has(c.name));
    if (listFilter === "not-in-list") result = result.filter((c) => !myListNames.has(c.name));
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(q));
    }
    return [...result].sort((a, b) => {
      const aIn = myListNames.has(a.name) ? 0 : 1;
      const bIn = myListNames.has(b.name) ? 0 : 1;
      if (aIn !== bIn) return aIn - bIn;
      return a.name.localeCompare(b.name);
    });
  }, [catalog, region, listFilter, debouncedSearch, myListNames]);

  const inListCount = catalog.filter((c) => myListNames.has(c.name)).length;
  const pct = Math.round((inListCount / catalog.length) * 100);
  const hasFilters = search !== "" || region !== "All" || listFilter !== "all";

  const clearAll = () => {
    setSearch(""); setDebouncedSearch(""); clearTimeout(debounceRef.current);
    setRegion("All"); setListFilter("all");
  };

  const toggleCard = (name: string) => {
    if (myListNames.has(name)) onRemoveFromList(name);
    else onAddToList(name);
  };

  /* ── Progress ring SVG ── */
  const ProgressRing = ({ size = 36, stroke = 3 }: { size?: number; stroke?: number }) => {
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (pct / 100) * circ;
    return (
      <svg width={size} height={size} className="shrink-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#10b981" strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-[stroke-dashoffset] duration-500" />
      </svg>
    );
  };

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

  /* ── List status pills (mobile panel) ── */
  const statusPills = (
    <div className="flex gap-1.5">
      {([["all", "Any"], ["in-list", "In List"], ["not-in-list", "Not Added"]] as const).map(([k, label]) => (
        <button
          key={k}
          onClick={() => setListFilter(k)}
          className={`flex-1 py-2 min-h-[32px] rounded-lg text-[10px] font-semibold transition-colors focus-ring ${
            listFilter === k
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-50 to-white overflow-hidden">
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
            >
              🎚️
            </button>
          </div>

          {/* Expandable filter panel */}
          {filtersOpen && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-2.5 space-y-2.5">
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
              <div>
                <p className="text-[10px] text-gray-400 mb-1">Status</p>
                {statusPills}
              </div>
            </div>
          )}

          {/* Summary line */}
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-gray-400">
              {filtered.length} of {catalog.length} • {inListCount} in list ({pct}%)
            </p>
          </div>
        </div>
      )}

      {/* ─── DESKTOP / TABLET TOOLBAR ─── */}
      {!isMobile && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200/80 bg-white shrink-0">
          <ProgressRing size={32} stroke={2.5} />
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-bold text-emerald-600">{inListCount}</span>
            <span className="text-[10px] text-gray-400">/ {catalog.length} ({pct}%)</span>
          </div>

          <div className="h-5 w-px bg-gray-200" />

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
            >
              {region === "All" ? "Region" : region}
              <svg className={`w-3 h-3 transition-transform ${regionOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
            {regionOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 w-48 rounded-xl border border-gray-200 bg-white shadow-lg p-2 space-y-0.5">
                {REGIONS.map((r) => (
                  <button key={r} onClick={() => { setRegion(r); setRegionOpen(false); }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors focus-ring ${region === r ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-600 hover:bg-gray-50"}`}
                  >{r === "All" ? "🌍 All Regions" : r}</button>
                ))}
              </div>
            )}
          </div>

          {/* Status chip + popover */}
          <div className="relative" ref={statusPopRef}>
            <button
              onClick={() => setStatusOpen((o) => !o)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors focus-ring ${
                listFilter !== "all" ? "bg-blue-50 text-blue-700 border-blue-200" : "text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
              aria-expanded={statusOpen}
            >
              {listFilter === "all" ? "Status" : listFilter === "in-list" ? "In List" : "Not Added"}
              <svg className={`w-3 h-3 transition-transform ${statusOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
            {statusOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 w-36 rounded-xl border border-gray-200 bg-white shadow-lg p-2 space-y-0.5">
                {([["all", "Any"], ["in-list", "In My List"], ["not-in-list", "Not Added"]] as const).map(([k, label]) => (
                  <button key={k} onClick={() => { setListFilter(k); setStatusOpen(false); }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors focus-ring ${listFilter === k ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-600 hover:bg-gray-50"}`}
                  >{label}</button>
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
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 md:px-5 py-4">
        <div className={`grid gap-2.5 max-w-6xl mx-auto ${
          isMobile ? "grid-cols-2" : isDesktop ? "grid-cols-4 lg:grid-cols-5" : "grid-cols-3"
        }`}>
          {filtered.map((entry) => {
            const inList = myListNames.has(entry.name);
            const borderColor = REGION_COLORS[entry.region] ?? "border-l-gray-300";
            return (
              <button
                key={entry.name}
                onClick={() => toggleCard(entry.name)}
                className={`group text-left rounded-xl border border-l-[3px] ${borderColor} p-3 transition focus-ring ${
                  inList
                    ? "bg-emerald-50/60 border-emerald-200 hover:bg-emerald-50"
                    : "bg-white border-gray-200 hover:border-blue-200 hover:shadow-md hover:-translate-y-0.5"
                }`}
                aria-pressed={inList}
                aria-label={inList ? `Remove ${entry.name} from list` : `Add ${entry.name} to list`}
              >
                <div className="flex items-start justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-base leading-none shrink-0">{getCountryFlag(entry.name)}</span>
                    <span className={`font-bold leading-tight truncate ${isMobile ? "text-[11px]" : "text-xs"} text-gray-800`}>
                      {entry.name}
                    </span>
                  </div>
                  {inList && <span className="text-emerald-500 text-xs shrink-0">✓</span>}
                </div>
                <span className="text-[9px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded inline-block mb-2">
                  {entry.region}
                </span>
                <div className={`text-[10px] font-medium transition-colors ${
                  inList
                    ? "text-red-400 group-hover:text-red-600"
                    : "text-blue-500 group-hover:text-blue-700"
                }`}>
                  {inList ? "Remove" : "+ Add to List"}
                </div>
              </button>
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
          className="fixed bottom-6 right-6 w-10 h-10 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors focus-ring z-40"
          aria-label="Scroll to top"
        >
          ↑
        </button>
      )}
    </div>
  );
}
