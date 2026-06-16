import { useMemo, useState, useEffect } from "react";
import type { Country, VisitedFilter } from "../../core/types";
import { type BudgetBasis, type BudgetTier } from "../../core/utils/filterLogic";
import { MONTHS } from "../../core/utils/months";
import { ALL_REGIONS, type Region, type TripGroupDef } from "../../core/data/tripGroups";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { getWikiImage } from "../../utils/wikiImages";
import { isEnabled } from "../../core/featureFlags";
import { fuzzySearchTrips } from "../../utils/fuzzySearch";

type Props = {
  countries: Country[];
  visitedNames: Set<string>;
  favorites: Set<string>;
  visitedFilter?: VisitedFilter;
  setVisitedFilter: (v: VisitedFilter) => void;
  selectedMonth: string[];
  setMonth: (m: string[]) => void;
  budgetFilter: BudgetTier;
  setBudgetFilter: (b: BudgetTier) => void;
  budgetBasis: BudgetBasis;
  setBudgetBasis: (b: BudgetBasis) => void;
  onSelect: (c: Country) => void;
  tripGroups: TripGroupDef[];
  onSaveTrip: (originalMain: string | null, group: TripGroupDef) => void;
  onDeleteTrip: (main: string) => void;
};

type Trip = {
  id: number;
  main: Country;
  addOns: Country[];
  allCountries: Country[];
  visitedCount: number;
  allVisited: boolean;
  noneVisited: boolean;
  isFavorited: boolean;
  region: Region;
  source: "group" | "solo";
};

type ViewMode = "all" | "combo" | "solo";
type VisitedMode = "all" | "completed" | "in-progress" | "not-started";
type SortMode = "popular" | "az" | "za";

function buildTrips(
  allCountries: Country[],
  tripGroups: TripGroupDef[],
  visitedNames: Set<string>,
  favorites: Set<string>,
): Trip[] {
  const byName = new Map(allCountries.map((c) => [c.name, c]));
  const groupByMain = new Map(tripGroups.map((g) => [g.main, g]));
  const trips: Trip[] = [];
  let nextId = 0;

  for (const main of allCountries) {
    const group = groupByMain.get(main.name);
    const addOns = (group?.addOns ?? [])
      .map((n) => byName.get(n))
      .filter((c): c is Country => c !== undefined && c.name !== main.name);
    const all = [main];
    const vCount = visitedNames.has(main.name) ? 1 : 0;
    trips.push({
      id: nextId++,
      main,
      addOns,
      allCountries: all,
      visitedCount: vCount,
      allVisited: vCount === all.length,
      noneVisited: vCount === 0,
      isFavorited: all.some((c) => favorites.has(c.name)),
      region: (group?.region ?? (main.region as Region)) || "Asia",
      source: group ? "group" : "solo",
    });
  }

  return trips;
}

export default function TripsView({
  countries,
  visitedNames,
  favorites,
  visitedFilter = "all",
  setVisitedFilter,
  selectedMonth,
  setMonth,
  budgetFilter,
  setBudgetFilter,
  budgetBasis,
  setBudgetBasis,
  onSelect,
  tripGroups,
  onSaveTrip,
  onDeleteTrip,
}: Props) {
  
const BUDGET_OPTIONS: { value: BudgetTier; label: string; desc: string }[] = [
  { value: "budget",  label: "₹ Budget",    desc: "under ₹1.5L" },
  { value: "mid",     label: "₹₹ Mid",      desc: "₹1.5L–₹3L"  },
  { value: "premium", label: "₹₹₹ Premium", desc: "₹3L+"        },
];

const BUDGET_BASIS_OPTIONS: { value: BudgetBasis; label: string }[] = [
  { value: "solo", label: "Solo" },
  { value: "couple", label: "Couple" },
  { value: "family4", label: "Family" },
];

  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [visitedMode, setVisitedMode] = useState<VisitedMode>("all");
  const [sortMode, setSortMode] = useState<SortMode>("popular");
  const [regionFilter, setRegionFilter] = useState<Region | "all">("all");
  const [search, setSearch] = useState("");
  const [editingMain, setEditingMain] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [layout, setLayout] = useState<"list" | "grid">(
    typeof window !== "undefined" && window.innerWidth < 768 ? "list" : "grid"
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [primaryFiltersOpen, setPrimaryFiltersOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(bp !== "tablet");
  const [isWideMobile, setIsWideMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 390 : false
  );
  const canUseMobileGrid = isMobile && isWideMobile;
  const effectiveLayout: "list" | "grid" = isMobile ? (canUseMobileGrid ? layout : "list") : layout;

  const hasPrimaryFilters = selectedMonth.length > 0 || budgetFilter !== "all" || visitedFilter !== "all";
  const hasSecondaryFilters = viewMode !== "all" || visitedMode !== "all" || regionFilter !== "all";

  useEffect(() => {
    function onResize() {
      setIsWideMobile(window.innerWidth >= 390);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (bp === "tablet") setRailOpen(false);
    if (bp === "desktop") setRailOpen(true);
  }, [bp]);


  const trips = useMemo(
    () => buildTrips(countries, tripGroups, visitedNames, favorites),
    [countries, tripGroups, visitedNames, favorites],
  );

  // Countries already assigned to a trip group (for the editor exclusion list)
  const assignedNames = useMemo(() => {
    const s = new Set<string>();
    for (const g of tripGroups) {
      s.add(g.main);
      for (const a of g.addOns) s.add(a);
    }
    return s;
  }, [tripGroups]);

  const filtered = useMemo(() => {
    let result = trips;

    if (viewMode === "combo") result = result.filter((t) => t.addOns.length > 0);
    if (viewMode === "solo") result = result.filter((t) => t.addOns.length === 0);

    if (visitedMode === "completed") result = result.filter((t) => t.allVisited);
    if (visitedMode === "in-progress") result = result.filter((t) => !t.allVisited && !t.noneVisited);
    if (visitedMode === "not-started") result = result.filter((t) => t.noneVisited);

    // Global visited filter at card level
    if (visitedFilter === "visited") result = result.filter((t) => t.allCountries.some((c) => visitedNames.has(c.name)));
    if (visitedFilter === "unvisited") result = result.filter((t) => t.allCountries.some((c) => !visitedNames.has(c.name)));

    if (regionFilter !== "all") result = result.filter((t) => t.region === regionFilter);

    // Search ranking should stay relevance-first while query is active.
    if (search.trim()) {
      result = fuzzySearchTrips(result, search);
    } else {
      result = [...result].sort((a, b) => {
        if (sortMode === "az") return a.main.name.localeCompare(b.main.name);
        if (sortMode === "za") return b.main.name.localeCompare(a.main.name);
        if (sortMode === "popular") {
          const popA = Math.max(...a.allCountries.map((c) => c.popularityScore ?? 0));
          const popB = Math.max(...b.allCountries.map((c) => c.popularityScore ?? 0));
          if (popA !== popB) return popB - popA;
          if (a.isFavorited !== b.isFavorited) return a.isFavorited ? -1 : 1;
          return a.main.name.localeCompare(b.main.name);
        }
        return a.main.name.localeCompare(b.main.name);
      });
    }

    return result;
  }, [trips, viewMode, visitedMode, visitedFilter, visitedNames, regionFilter, search, sortMode]);

  const uniqueCountries = new Set(trips.flatMap((t) => t.allCountries.map((c) => c.name))).size;
  const totalVisited = new Set(trips.flatMap((t) => t.allCountries.filter((c) => visitedNames.has(c.name)).map((c) => c.name))).size;
  const tripsCompleted = trips.filter((t) => t.allVisited).length;

  // Group filtered trips into sections
  const favoriteTrips = filtered.filter((t) => t.isFavorited && !t.allVisited);
  const planning = filtered.filter((t) => !t.isFavorited && !t.allVisited);
  const completed = filtered.filter((t) => t.allVisited);

  // Next trip highlight — top favorited unvisited
  const nextTrip = trips.find((t) => t.isFavorited && !t.allVisited) ?? trips.find((t) => !t.allVisited);

  // Best upcoming month — month with most unvisited destinations
  const bestMonth = useMemo(() => {
    const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const now = new Date().getMonth(); // 0-indexed
    const freq = new Map<string, number>();
    for (const t of trips) {
      if (t.allVisited) continue;
      for (const c of t.allCountries) {
        if (visitedNames.has(c.name)) continue;
        for (const m of c.bestMonths ?? []) freq.set(m, (freq.get(m) ?? 0) + 1);
      }
    }
    if (freq.size === 0) return null;
    // Prefer months that are upcoming (within next 6 months)
    const sorted = [...freq.entries()].sort((a, b) => {
      const aDist = (MONTHS.indexOf(a[0]) - now + 12) % 12;
      const bDist = (MONTHS.indexOf(b[0]) - now + 12) % 12;
      // Weight: upcoming months get a boost
      const aScore = a[1] + (aDist <= 3 ? 5 : aDist <= 6 ? 2 : 0);
      const bScore = b[1] + (bDist <= 3 ? 5 : bDist <= 6 ? 2 : 0);
      return bScore - aScore;
    });
    return { month: sorted[0][0], count: sorted[0][1] };
  }, [trips, visitedNames]);

  // Unique regions across all trips
  const uniqueRegions = new Set(trips.map((t) => t.region)).size;

  const handleSave = (originalMain: string | null, group: TripGroupDef) => {
    onSaveTrip(originalMain, group);
    setEditingMain(null);
    setCreatingNew(false);
  };

  const handleDelete = (main: string) => {
    onDeleteTrip(main);
    setEditingMain(null);
  };

  const renderTripsContent = (widthClass: string) => (
    <div className={`${widthClass} mx-auto space-y-6`}>
      {creatingNew && (
        <div className="mb-4">
          <TripEditor
            initial={null}
            allCountryNames={countries.map((c) => c.name)}
            countryRegionMap={Object.fromEntries(countries.filter((c) => c.region).map((c) => [c.name, c.region!]))}
            assignedNames={assignedNames}
            currentTripNames={[]}
            onSave={(group) => handleSave(null, group)}
            onCancel={() => setCreatingNew(false)}
            onDelete={null}
          />
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-[10px] text-gray-400">
          Showing {filtered.length} of {countries.length} countries
        </p>
      )}

      {favoriteTrips.length > 0 && (
        <PaginatedTripSection
          icon="⭐"
          label="Favorites"
          count={favoriteTrips.length}
          color="text-yellow-600"
          trips={favoriteTrips}
          renderCards={renderTripCards}
          pageSize={effectiveLayout === "grid" ? 6 : 5}
        />
      )}

      {planning.length > 0 && (
        <PaginatedTripSection
          icon="📋"
          label="Planning"
          count={planning.length}
          color="text-blue-600"
          trips={planning}
          renderCards={renderTripCards}
          pageSize={effectiveLayout === "grid" ? 6 : 5}
        />
      )}

      {completed.length > 0 && (
        <PaginatedTripSection
          icon="✅"
          label="Completed"
          count={completed.length}
          color="text-emerald-600"
          trips={completed}
          renderCards={renderTripCards}
          pageSize={effectiveLayout === "grid" ? 6 : 5}
        />
      )}

      {filtered.length === 0 && !creatingNew && (
        <div className="text-center py-20 space-y-4">
          <span className="text-5xl block">🌍</span>
          <p className="text-lg font-bold text-slate-700">Your travel board is empty</p>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Head to Discover to add countries, then come back here to organize them into trips.
          </p>
          <button
            onClick={() => { setCreatingNew(true); }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            + Create your first trip
          </button>
        </div>
      )}
    </div>
  );
  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="border-b bg-white shrink-0">
        {/* Mobile: compact row + expandable filter panels */}
        <div className="md:hidden px-3 py-2 space-y-2">
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full px-2 py-1.5 pr-8 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-300 focus:outline-none transition-colors h-8"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm p-0.5"
                  title="Clear"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={() => {
                setPrimaryFiltersOpen((o) => !o);
                setFiltersOpen(false);
              }}
              className={`flex items-center justify-center w-8 h-8 rounded-lg border text-xs ${
                primaryFiltersOpen || hasPrimaryFilters
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "text-gray-500 border-gray-200 hover:bg-gray-100"
              }`}
              title="Primary filters"
            >
              🎚️
            </button>

            <button
              onClick={() => {
                setFiltersOpen((o) => !o);
                setPrimaryFiltersOpen(false);
              }}
              className={`flex items-center justify-center w-8 h-8 rounded-lg border text-xs ${
                filtersOpen || hasSecondaryFilters
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "text-gray-500 border-gray-200 hover:bg-gray-100"
              }`}
              title="Secondary filters"
            >
              ⚙️
            </button>

            {canUseMobileGrid && (
              <button
                onClick={() => setLayout(layout === "grid" ? "list" : "grid")}
                className="flex items-center justify-center w-8 h-8 text-gray-500 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                title={layout === "grid" ? "Switch to list" : "Switch to grid"}
              >
                {layout === "grid" ? "▦" : "≡"}
              </button>
            )}

            <button
              onClick={() => setStatsOpen((o) => !o)}
              className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-colors ${
                statsOpen ? "bg-blue-50 text-blue-700 border-blue-200" : "text-gray-500 hover:bg-gray-100 border-gray-200"
              }`}
              title="View stats"
            >
              📊
            </button>
          </div>

          {primaryFiltersOpen && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Primary filters</p>
                {hasPrimaryFilters && (
                  <button
                    onClick={() => { setMonth([]); setBudgetBasis("couple"); setBudgetFilter("all"); setVisitedFilter("all"); }}
                    className="text-[10px] font-semibold text-red-600"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div>
                <p className="text-[10px] font-bold text-gray-500 mb-1">Month</p>
                <div className="grid grid-cols-4 gap-1">
                  {MONTHS.map((m) => (
                    <button
                      key={m}
                      onClick={() => setMonth(selectedMonth.includes(m) ? selectedMonth.filter((x) => x !== m) : [...selectedMonth, m])}
                      className={`py-1.5 rounded-lg text-[10px] font-semibold ${
                        selectedMonth.includes(m)
                          ? "bg-blue-600 text-white"
                          : "bg-white text-gray-600 border border-gray-200"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-gray-500 mb-1">Budget basis</p>
                <div className="grid grid-cols-3 gap-1 mb-2">
                  {BUDGET_BASIS_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setBudgetBasis(value)}
                      className={`py-1.5 rounded-lg text-[10px] font-semibold ${
                        budgetBasis === value
                          ? "bg-blue-600 text-white"
                          : "bg-white text-gray-600 border border-gray-200"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] font-bold text-gray-500 mb-1">Budget</p>
                <p className="text-[9px] text-gray-400 mb-1">Basis: {BUDGET_BASIS_OPTIONS.find((x) => x.value === budgetBasis)?.label}</p>
                <div className="grid grid-cols-3 gap-1">
                  {BUDGET_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setBudgetFilter(budgetFilter === value ? "all" : value)}
                      className={`py-1.5 rounded-lg text-[10px] font-semibold ${
                        budgetFilter === value
                          ? "bg-amber-500 text-white"
                          : "bg-white text-gray-600 border border-gray-200"
                      }`}
                    >
                      {label.replace("₹₹₹ Premium", "Premium").replace("₹₹ Mid", "Mid").replace("₹ Budget", "Budget")}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-gray-500 mb-1">Visited</p>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { value: "all", label: "All" },
                    { value: "unvisited", label: "Not visited" },
                    { value: "visited", label: "Visited" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => setVisitedFilter(item.value as VisitedFilter)}
                      className={`py-1.5 rounded-lg text-[10px] font-semibold ${
                        visitedFilter === item.value
                          ? "bg-blue-600 text-white"
                          : "bg-white text-gray-600 border border-gray-200"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {filtersOpen && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Secondary filters</p>
                {hasSecondaryFilters && (
                  <button
                    onClick={() => { setViewMode("all"); setVisitedMode("all"); setRegionFilter("all"); }}
                    className="text-[10px] font-semibold text-red-600"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div>
                <p className="text-[10px] font-bold text-gray-500 mb-1">View</p>
                <div className="grid grid-cols-3 gap-1">
                  {["all", "combo", "solo"].map((m) => (
                    <button
                      key={m}
                      onClick={() => setViewMode(m as ViewMode)}
                      className={`py-1.5 rounded-lg text-[10px] font-semibold ${
                        viewMode === m ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200"
                      }`}
                    >
                      {m === "all" ? "All" : m === "combo" ? "Combo" : "Solo"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-gray-500 mb-1">Status</p>
                <div className="grid grid-cols-2 gap-1">
                  {["all", "completed", "in-progress", "not-started"].map((m) => (
                    <button
                      key={m}
                      onClick={() => setVisitedMode(m as VisitedMode)}
                      className={`py-1.5 rounded-lg text-[10px] font-semibold ${
                        visitedMode === m ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200"
                      }`}
                    >
                      {m === "all" ? "All" : m === "completed" ? "Completed" : m === "in-progress" ? "In progress" : "Not started"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-gray-500 mb-1">Region</p>
                <select
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value as Region | "all")}
                  className="w-full px-2.5 py-2 rounded-lg text-xs font-semibold border border-gray-200 bg-white text-gray-700"
                >
                  <option value="all">All regions</option>
                  {ALL_REGIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <p className="text-[10px] font-bold text-gray-500 mb-1">Sort</p>
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="w-full px-2.5 py-2 rounded-lg text-xs font-semibold border border-gray-200 bg-white text-gray-700"
                >
                  <option value="popular">Popularity</option>
                  <option value="az">A to Z</option>
                  <option value="za">Z to A</option>
                </select>
              </div>
            </div>
          )}
        </div>

      </div>


      {/* Stats modal */}
      {isMobile && statsOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setStatsOpen(false)} />
          <div className="fixed left-3 right-3 bottom-3 z-50 bg-white rounded-2xl shadow-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-700">Travel Progress</p>
              <button onClick={() => setStatsOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
            </div>

            {/* Visited progress */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-800">{totalVisited}</span>
                <span className="text-sm text-slate-400">/ {uniqueCountries}</span>
              </div>
              <div className="flex-1">
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                    style={{ width: `${uniqueCountries > 0 ? (totalVisited / uniqueCountries) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-[9px] text-slate-400 mt-0.5">destinations visited</p>
              </div>
            </div>

            {/* Stat chips */}
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full">
                <span className="font-bold text-slate-700">{trips.length}</span> cards
              </span>
              <span className="text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full">
                <span className="font-bold text-slate-700">{uniqueRegions}</span> regions
              </span>
              <span className="text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full">
                <span className="font-bold text-slate-700">{tripsCompleted}</span> completed
              </span>
            </div>

            {/* Best month */}
            {bestMonth && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-amber-50 px-3 py-2 rounded-lg">
                <span>☀️</span>
                <span>Best month: <span className="font-bold text-slate-700">{bestMonth.month}</span></span>
                <span className="text-[9px] text-slate-400">({bestMonth.count} destinations)</span>
              </div>
            )}

            {/* Next trip quick action */}
            {nextTrip && (
              <button
                onClick={() => { setStatsOpen(false); onSelect(nextTrip.main); }}
                className="w-full mt-3 flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded-lg text-white transition-all"
              >
                <span>🎯</span>
                <span className="text-xs font-semibold">{nextTrip.main.name}</span>
              </button>
            )}
          </div>
        </>
      )}

      {isMobile ? (
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {renderTripsContent("max-w-5xl")}
        </div>
      ) : (
        <div className="hidden md:flex flex-1 overflow-hidden">
          {railOpen ? (
            <aside className="w-72 lg:w-80 shrink-0 border-r border-gray-200 bg-white overflow-y-auto p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Primary filters</p>
                <button
                  onClick={() => setRailOpen(false)}
                  className="px-2 py-1 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                  title="Hide filters"
                  aria-label="Hide filters"
                >
                  ⟨
                </button>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 mb-1">Month</p>
                  <div className="grid grid-cols-4 gap-1">
                    {MONTHS.map((m) => (
                      <button
                        key={m}
                        onClick={() => setMonth(selectedMonth.includes(m) ? selectedMonth.filter((x) => x !== m) : [...selectedMonth, m])}
                        className={`py-1.5 rounded-lg text-[10px] font-semibold ${
                          selectedMonth.includes(m)
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-semibold text-gray-500 mb-1">Budget + travelers</p>
                  <div className="grid grid-cols-3 gap-1 mb-1.5">
                    {BUDGET_BASIS_OPTIONS.map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => setBudgetBasis(value)}
                        className={`py-1.5 rounded-lg text-[10px] font-semibold ${
                          budgetBasis === value
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-1">
                    {BUDGET_OPTIONS.map(({ value, label, desc }) => (
                      <button
                        key={value}
                        onClick={() => setBudgetFilter(budgetFilter === value ? "all" : value)}
                        className={`w-full px-3 py-2 rounded-lg text-left ${
                          budgetFilter === value ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-gray-50 text-gray-600 border border-transparent hover:bg-gray-100"
                        }`}
                      >
                        <p className="text-[11px] font-semibold">{label}</p>
                        <p className="text-[10px] opacity-75">{desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-semibold text-gray-500 mb-1">Visited</p>
                  <select
                    value={visitedFilter}
                    onChange={(e) => setVisitedFilter(e.target.value as VisitedFilter)}
                    className="w-full px-2.5 py-2 rounded-lg text-xs font-semibold border border-gray-200 bg-white text-gray-700"
                  >
                    <option value="all">All countries</option>
                    <option value="unvisited">Not visited</option>
                    <option value="visited">Visited</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 space-y-2">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Trip filters</p>
                <select
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value as ViewMode)}
                  className="w-full px-2.5 py-2 rounded-lg text-xs font-semibold border border-gray-200 bg-white text-gray-700"
                  title="Trip type"
                >
                  <option value="all">All trips</option>
                  <option value="combo">Combo trips</option>
                  <option value="solo">Solo trips</option>
                </select>
                <select
                  value={visitedMode}
                  onChange={(e) => setVisitedMode(e.target.value as VisitedMode)}
                  className="w-full px-2.5 py-2 rounded-lg text-xs font-semibold border border-gray-200 bg-white text-gray-700"
                  title="Trip progress"
                >
                  <option value="all">All status</option>
                  <option value="completed">Completed</option>
                  <option value="in-progress">In progress</option>
                  <option value="not-started">Not started</option>
                </select>
                <select
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value as Region | "all")}
                  className="w-full px-2.5 py-2 rounded-lg text-xs font-semibold border border-gray-200 bg-white text-gray-700"
                  title="Region filter"
                >
                  <option value="all">All regions</option>
                  {ALL_REGIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                {(selectedMonth.length > 0 || budgetFilter !== "all" || budgetBasis !== "couple" || visitedFilter !== "all" || hasSecondaryFilters) && (
                  <button
                    onClick={() => {
                      setMonth([]);
                      setBudgetBasis("couple");
                      setBudgetFilter("all");
                      setVisitedFilter("all");
                      setViewMode("all");
                      setVisitedMode("all");
                      setRegionFilter("all");
                    }}
                    className="w-full px-3 py-2 rounded-lg text-xs font-semibold text-red-600 border border-red-100 hover:bg-red-50"
                  >
                    Clear all filters
                  </button>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Trip stats</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black text-slate-800">{totalVisited}</span>
                  <span className="text-xs text-slate-400">/ {uniqueCountries} visited</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                    style={{ width: `${uniqueCountries > 0 ? (totalVisited / uniqueCountries) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-slate-500 bg-white px-2 py-1 rounded-full border border-gray-200">
                    <span className="font-bold text-slate-700">{trips.length}</span> cards
                  </span>
                  <span className="text-[10px] text-slate-500 bg-white px-2 py-1 rounded-full border border-gray-200">
                    <span className="font-bold text-slate-700">{uniqueRegions}</span> regions
                  </span>
                  <span className="text-[10px] text-slate-500 bg-white px-2 py-1 rounded-full border border-gray-200">
                    <span className="font-bold text-slate-700">{tripsCompleted}</span> completed
                  </span>
                </div>
                {bestMonth && (
                  <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5">
                    Best month: <span className="font-semibold">{bestMonth.month}</span> ({bestMonth.count})
                  </p>
                )}
                {nextTrip && (
                  <button
                    onClick={() => onSelect(nextTrip.main)}
                    className="w-full mt-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-xs font-semibold"
                  >
                    Open next trip: {nextTrip.main.name}
                  </button>
                )}
              </div>
            </aside>
          ) : (
            <aside className="w-11 shrink-0 border-r border-gray-200 bg-white flex items-start justify-center pt-3">
              <button
                onClick={() => setRailOpen(true)}
                className="w-7 h-7 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                title="Show filters"
                aria-label="Show filters"
              >
                ⟩
              </button>
            </aside>
          )}

          <div className="flex-1 overflow-y-auto px-5 lg:px-6 py-4">
            <div className="max-w-6xl mx-auto space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[16rem]">
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search countries, cities..."
                      className="w-full px-3 py-2 pr-8 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-300 focus:outline-none"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm p-0.5"
                        title="Clear search"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setLayout("list")}
                      className={`px-2.5 py-2 text-sm leading-none ${layout === "list" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"}`}
                      title="List view"
                      aria-label="List view"
                    >
                      ≡
                    </button>
                    <button
                      onClick={() => setLayout("grid")}
                      className={`px-2.5 py-2 text-sm leading-none border-l border-gray-200 ${layout === "grid" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"}`}
                      title="Grid view"
                      aria-label="Grid view"
                    >
                      ▦
                    </button>
                  </div>

                  <select
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value as SortMode)}
                    className="px-2.5 py-2 text-xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-700"
                    title="Sort trips"
                  >
                    <option value="popular">Sort: Popularity</option>
                    <option value="az">Sort: A to Z</option>
                    <option value="za">Sort: Z to A</option>
                  </select>

                  <span className="text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2">
                    {filtered.length} of {trips.length}
                  </span>

                  {isEnabled("tripGroups") && (
                    <button
                      onClick={() => { setCreatingNew(true); setEditingMain(null); }}
                      className="px-3 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    >
                      + New Trip
                    </button>
                  )}
                </div>
              </div>
              {renderTripsContent(effectiveLayout === "grid" ? "max-w-6xl" : "max-w-5xl")}
            </div>
          </div>
        </div>
      )}

      {/* Mobile FAB — New Trip */}
      {isEnabled("tripGroups") && !creatingNew && (
        <button
          onClick={() => { setCreatingNew(true); setEditingMain(null); }}
          className="md:hidden fixed bottom-5 right-5 z-30 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center text-2xl"
          title="New Trip"
        >
          +
        </button>
      )}
    </div>
  );

  function renderTripCards(tripList: Trip[]) {
    return (
      <div className={effectiveLayout === "grid" ? "grid grid-cols-2 lg:grid-cols-3 gap-3" : "grid gap-3"}>
        {tripList.map((trip) =>
          editingMain === trip.main.name ? (
            <TripEditor
              key={trip.id}
              initial={{
                main: trip.main.name,
                addOns: trip.addOns.map((c) => c.name),
                region: trip.region,
              }}
              allCountryNames={countries.map((c) => c.name)}
              countryRegionMap={Object.fromEntries(countries.filter((c) => c.region).map((c) => [c.name, c.region!]))}
              assignedNames={assignedNames}
              currentTripNames={trip.allCountries.map((c) => c.name)}
              onSave={(group) => handleSave(trip.main.name, group)}
              onCancel={() => setEditingMain(null)}
              onDelete={() => handleDelete(trip.main.name)}
            />
          ) : (
            <TripRow
              key={trip.id}
              trip={trip}
              visitedNames={visitedNames}
              favorites={favorites}
              onSelect={onSelect}
              compact={effectiveLayout === "grid"}
              onEdit={trip.source === "group" ? () => { setEditingMain(trip.main.name); setCreatingNew(false); } : undefined}
            />
          ),
        )}
      </div>
    );
  }
}

/* ── Inline Trip Editor ─────────────────────────────────────────────── */

function TripEditor({
  initial,
  allCountryNames,
  countryRegionMap,
  assignedNames,
  currentTripNames,
  onSave,
  onCancel,
  onDelete,
}: {
  initial: TripGroupDef | null;
  allCountryNames: string[];
  countryRegionMap: Record<string, string>;
  assignedNames: Set<string>;
  currentTripNames: string[];
  onSave: (group: TripGroupDef) => void;
  onCancel: () => void;
  onDelete: (() => void) | null;
}) {
  const [main, setMain] = useState(initial?.main ?? "");
  const [addOns, setAddOns] = useState<string[]>(initial?.addOns ?? []);
  const [region, setRegion] = useState<Region>(initial?.region ?? "Asia");
  const [addOnSearch, setAddOnSearch] = useState("");

  const currentSet = new Set(currentTripNames);
  const sorted = [...allCountryNames].sort();

  // Available for main: not assigned elsewhere, filtered by selected region
  const availableMain = sorted.filter(
    (n) => (!assignedNames.has(n) || currentSet.has(n) || n === main) &&
           (countryRegionMap[n] === region || n === main)
  );

  // Available for add-ons: not assigned elsewhere, not main, filtered by region
  const availableAddOns = sorted.filter(
    (n) => n !== main && (!assignedNames.has(n) || currentSet.has(n) || addOns.includes(n)) &&
           (countryRegionMap[n] === region || addOns.includes(n))
  );

  const filteredAddOns = addOnSearch.trim()
    ? availableAddOns.filter((n) => n.toLowerCase().includes(addOnSearch.toLowerCase()))
    : availableAddOns;

  const toggleAddOn = (name: string) => {
    setAddOns((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : prev.length < 2 ? [...prev, name] : prev
    );
  };

  const canSave = main.trim() !== "";

  // If main is changed and was an add-on, remove it
  const handleMainChange = (newMain: string) => {
    setMain(newMain);
    setAddOns((prev) => prev.filter((n) => n !== newMain));
    if (countryRegionMap[newMain]) {
      setRegion(countryRegionMap[newMain] as Region);
    }
  };

  return (
    <div className="rounded-xl border-2 border-blue-300 bg-blue-50/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-blue-700">
          {initial ? "Edit Trip" : "New Trip"}
        </span>
        <div className="flex items-center gap-2">
          {onDelete && (
            <button
              onClick={onDelete}
              className="text-[10px] font-medium text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors"
            >
              🗑 Delete
            </button>
          )}
          <button
            onClick={onCancel}
            className="text-[10px] font-medium text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => canSave && onSave({ main, addOns, region })}
            disabled={!canSave}
            className={`text-[10px] font-semibold px-3 py-1 rounded-lg transition-colors ${
              canSave
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            Save
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_1fr_auto] gap-3">
        {/* Main country */}
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
            Main Country
          </label>
          <select
            value={main}
            onChange={(e) => handleMainChange(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:border-blue-300 focus:outline-none"
          >
            <option value="">Select…</option>
            {availableMain.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {/* Region */}
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
            Region
          </label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value as Region)}
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:border-blue-300 focus:outline-none"
          >
            {ALL_REGIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Add-on count badge */}
        <div className="flex items-end pb-0.5">
          <span className="text-[10px] font-medium text-gray-400">
            {addOns.length}/2 add-ons
          </span>
        </div>
      </div>

      {/* Add-on selector */}
      <div>
        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
          Add-on Countries (max 2)
        </label>

        {/* Selected add-ons as removable chips */}
        {addOns.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {addOns.map((n) => (
              <button
                key={n}
                onClick={() => toggleAddOn(n)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
              >
                {n}
                <span className="text-blue-400 text-[10px]">✕</span>
              </button>
            ))}
          </div>
        )}

        {/* Search + scrollable list */}
        <input
          type="text"
          value={addOnSearch}
          onChange={(e) => setAddOnSearch(e.target.value)}
          placeholder="Search countries to add…"
          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:border-blue-300 focus:outline-none mb-1.5"
        />
        <div className="max-h-32 overflow-y-auto rounded-lg border border-gray-100 bg-white">
          {filteredAddOns.length > 0 ? filteredAddOns.map((n) => {
            const isSelected = addOns.includes(n);
            const isDisabled = !isSelected && addOns.length >= 2;
            return (
              <button
                key={n}
                onClick={() => !isDisabled && toggleAddOn(n)}
                disabled={isDisabled}
                className={`w-full text-left px-3 py-1.5 text-xs border-b border-gray-50 last:border-0 transition-colors ${
                  isSelected
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : isDisabled
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {isSelected ? "✓ " : "  "}{n}
              </button>
            );
          }) : (
            <div className="px-3 py-2 text-xs text-gray-400">No matching countries</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Shared sub-components ──────────────────────────────────────────── */

function TripSection({ icon, label, count, color, children, defaultOpen = true }: {
  icon: string; label: string; count: number; color: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 mb-3 w-full text-left group"
      >
        <span className={`text-[10px] transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
        <span className="text-sm">{icon}</span>
        <span className={`text-xs font-bold uppercase tracking-wider ${color}`}>{label}</span>
        <span className="text-[10px] text-slate-400 font-semibold bg-slate-100 px-2 py-0.5 rounded-full">{count}</span>
        <span className="flex-1 h-px bg-slate-200 ml-2" />
      </button>
      {open && children}
    </div>
  );
}

function PaginatedTripSection({ icon, label, count, color, trips, renderCards, pageSize }: {
  icon: string; label: string; count: number; color: string;
  trips: Trip[]; renderCards: (list: Trip[]) => React.ReactNode; pageSize: number;
}) {
  const [page, setPage] = useState(1);
  const visible = trips.slice(0, page * pageSize);
  const hasMore = visible.length < trips.length;

  return (
    <TripSection icon={icon} label={label} count={count} color={color}>
      {renderCards(visible)}
      {hasMore && (
        <div className="flex justify-center mt-3">
          <button
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-1.5 text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            Show more ({trips.length - visible.length} remaining)
          </button>
        </div>
      )}
    </TripSection>
  );
}

const REGION_ACCENT: Record<string, string> = {
  Asia: "border-l-rose-400",
  Europe: "border-l-blue-400",
  "Middle East": "border-l-amber-400",
  Africa: "border-l-orange-400",
  Americas: "border-l-emerald-400",
  Oceania: "border-l-cyan-400",
};

const REGION_BADGE: Record<string, string> = {
  Asia: "bg-rose-50 text-rose-600",
  Europe: "bg-blue-50 text-blue-600",
  "Middle East": "bg-amber-50 text-amber-600",
  Africa: "bg-orange-50 text-orange-600",
  Americas: "bg-emerald-50 text-emerald-600",
  Oceania: "bg-cyan-50 text-cyan-600",
};

function TripRow({
  trip,
  visitedNames,
  favorites,
  onSelect,
  onEdit,
  compact,
}: {
  trip: Trip;
  visitedNames: Set<string>;
  favorites: Set<string>;
  onSelect: (c: Country) => void;
  onEdit?: () => void;
  compact?: boolean;
}) {
  const isCombo = trip.addOns.length > 0;
  const suggestedPairs = !isCombo && !trip.allVisited ? (trip.main.combo ?? []).slice(0, 2) : [];
  const progress = trip.allCountries.length > 0
    ? Math.round((trip.visitedCount / trip.allCountries.length) * 100)
    : 0;

  // Build search queries for images — country landmark or "country name travel"
  const imageQueries = trip.allCountries.slice(0, 3).map((c) =>
    c.landmark ? `${c.landmark} ${c.name}` : `${c.name} travel landmark`
  );

  const accent = REGION_ACCENT[trip.region] ?? "border-l-slate-300";

  return (
    <div
      onClick={() => onSelect(trip.main)}
      className={`rounded-xl border border-l-[3px] overflow-hidden transition-all group cursor-pointer ${accent} ${
        trip.allVisited
          ? "bg-emerald-50/60 border-emerald-200"
          : "bg-white border-gray-200 hover:border-blue-200 hover:shadow-md hover:-translate-y-0.5"
      }`}
    >
      {/* Image collage strip */}
      <ImageCollage queries={imageQueries} />

      <div className={compact ? "p-3" : "p-4"}>
      {compact ? (
        /* Compact grid layout — stacked */
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <button
              onClick={() => onSelect(trip.main)}
              className="text-sm font-bold text-gray-800 hover:text-blue-600 transition-colors truncate"
            >
              {trip.allVisited ? "✅ " : ""}{trip.main.name}
            </button>
            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded shrink-0 ml-1 ${REGION_BADGE[trip.region] ?? "bg-gray-50 text-gray-400"}`}>
              {trip.region}
            </span>
          </div>
          {isCombo && (
            <div className="flex min-h-[22px] items-center gap-1 mb-1.5 flex-wrap">
              <span className="text-gray-300 text-[10px]">+</span>
              {trip.addOns.map((c) => (
                <button
                  key={c.name}
                  onClick={(e) => { e.stopPropagation(); onSelect(c); }}
                  className="text-[10px] font-medium text-gray-600 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 px-2 py-0.5 rounded-full transition-colors"
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
          {!isCombo && (
            <div className="flex min-h-[22px] items-center gap-1 mb-1.5 flex-wrap">
              {suggestedPairs.length > 0 ? (
                <>
                  <span className="text-gray-300 text-[10px]">+</span>
                  {suggestedPairs.map((name) => (
                    <span
                      key={name}
                      className="text-[10px] font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100"
                    >
                      {name}
                    </span>
                  ))}
                </>
              ) : (
                <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                  No combo yet
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 font-medium">{trip.visitedCount}/{trip.allCountries.length}</span>
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${trip.allVisited ? "bg-emerald-400" : "bg-blue-400"}`}
                style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      ) : (
        /* Full list layout */
        <>
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-base shrink-0">
            {trip.allVisited ? "✅" : isCombo ? "🔗" : "📍"}
          </span>
          <button
            onClick={() => onSelect(trip.main)}
            className="text-sm font-bold text-gray-800 hover:text-blue-600 transition-colors truncate"
          >
            {trip.main.name}
          </button>
          <span className={`shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded ${REGION_BADGE[trip.region] ?? "bg-gray-50 text-gray-400"}`}>
            {trip.region}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="md:opacity-0 md:group-hover:opacity-100 text-[11px] text-gray-400 hover:text-blue-600 px-1.5 py-0.5 rounded hover:bg-blue-50 transition-all"
              title="Edit trip"
            >
              ✏️
            </button>
          )}
          <span className="text-[10px] text-gray-400 font-medium">
            {trip.visitedCount}/{trip.allCountries.length}
          </span>
          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                trip.allVisited ? "bg-emerald-400" : "bg-blue-400"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Budget + best months info (list mode only) */}
      {!compact && (
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {trip.main.budget && (
            <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">💰 {trip.main.budget}</span>
          )}
          {trip.main.bestMonths?.slice(0, 3).map((m) => (
            <span key={m} className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">{m}</span>
          ))}
        </div>
      )}

      {suggestedPairs.length > 0 && !compact && (
        <div className="flex items-center gap-1 mb-2 flex-wrap">
          <span className="text-gray-300 text-xs">+</span>
          {suggestedPairs.map((name) => (
            <span
              key={name}
              className="text-[10px] font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100"
            >
              {name}
            </span>
          ))}
        </div>
      )}

      {/* Add-on chips (list mode only) */}
      {!compact && isCombo && trip.addOns.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {trip.addOns.map((c) => {
            const isVisited = visitedNames.has(c.name);
            const isFav = favorites.has(c.name);
            return (
              <button
                key={c.name}
                onClick={(e) => { e.stopPropagation(); onSelect(c); }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                  isVisited
                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                    : "bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                }`}
              >
                {isVisited
                  ? <span className="text-[10px]">✓</span>
                  : isFav
                    ? <span className="text-yellow-500 text-[10px]">★</span>
                    : null}
                {c.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Shared experiences (list mode only) */}
      {isCombo && !compact && (
        <div className="mt-2 flex flex-wrap gap-1">
          {getSharedExperiences(trip.allCountries).slice(0, 4).map((exp) => (
            <span
              key={exp}
              className="text-[9px] font-medium text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded"
            >
              {exp}
            </span>
          ))}
        </div>
      )}
      </>
      )}
      </div>
    </div>
  );
}

function getSharedExperiences(countries: Country[]): string[] {
  if (countries.length < 2) return [];
  const freq = new Map<string, number>();
  for (const c of countries) {
    for (const e of c.experiences) {
      freq.set(e, (freq.get(e) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([e]) => e);
}

function ImageCollage({ queries }: { queries: string[] }) {
  const [images, setImages] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    Promise.allSettled(queries.map((q) => getWikiImage(q))).then((results) => {
      if (cancelled) return;
      const urls = results
        .filter((r): r is PromiseFulfilledResult<string | null> => r.status === "fulfilled")
        .map((r) => r.value)
        .filter((v): v is string => !!v);
      setImages(urls);
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [queries.join(",")]);

  if (!loaded) {
    return (
      <div className="relative h-24 overflow-hidden bg-slate-200 rounded-t-xl">
        <div className="absolute inset-0 shimmer-sweep" />
      </div>
    );
  }

  if (images.length === 0) return null;

  return (
    <div className="flex h-24 overflow-hidden">
      {images.slice(0, 3).map((url, i) => (
        <div key={i} className="flex-1 relative overflow-hidden">
          <img
            src={url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          {/* Subtle gradient overlay for text readability if needed */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      ))}
    </div>
  );
}
