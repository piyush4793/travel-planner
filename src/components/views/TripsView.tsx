import { useMemo, useState, useEffect, useRef } from "react";
import type { Country, VisitedFilter } from "../../core/types";
import { type BudgetBasis, type BudgetTier } from "../../core/utils/filterLogic";
import { MONTHS } from "../../core/utils/months";
import { ALL_REGIONS, type Region, type TripGroupDef } from "../../core/data/tripGroups";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { getWikiImage } from "../../utils/wikiImages";
import { isEnabled } from "../../core/featureFlags";
import { fuzzySearchTrips } from "../../utils/fuzzySearch";
import { useConfirm } from "../shared/ConfirmDialog";
import { createPortal } from "react-dom";

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
  isCustom?: boolean;
};

type ViewMode = "all" | "combo" | "solo";
type VisitedMode = "all" | "completed" | "in-progress" | "not-started";
type SortMode = "popular" | "az" | "za";
const SORT_HELP_DELAY_MS = 120;

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
      isCustom: group?.isCustom,
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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(bp !== "tablet");
  const [isWideMobile, setIsWideMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 360 : false
  );
  const [showSortHelp, setShowSortHelp] = useState(false);
  const sortHelpTimerRef = useRef<number | null>(null);
  const [confirm, ConfirmDialog] = useConfirm();
  const canUseMobileGrid = isMobile && isWideMobile;
  const effectiveLayout: "list" | "grid" = isMobile ? (canUseMobileGrid ? layout : "list") : layout;

  const hasPrimaryFilters = selectedMonth.length > 0 || budgetFilter !== "all" || visitedFilter !== "all";
  const hasSecondaryFilters = viewMode !== "all" || visitedMode !== "all" || regionFilter !== "all";
  const activeFilterCount = (selectedMonth.length > 0 ? 1 : 0) + (budgetFilter !== "all" ? 1 : 0) + (visitedFilter !== "all" ? 1 : 0) + (viewMode !== "all" ? 1 : 0) + (visitedMode !== "all" ? 1 : 0) + (regionFilter !== "all" ? 1 : 0);
  const basisLabel = BUDGET_BASIS_OPTIONS.find((x) => x.value === budgetBasis)?.label ?? "Couple";
  const sortSummary = sortMode === "popular" ? "Popularity" : sortMode === "az" ? "A to Z" : "Z to A";
  const sortHelpText = `Sort: ${sortSummary}. Cards stay sectioned as Favorites, Planning, and Completed. Budget chips follow ${BUDGET_BASIS_META[budgetBasis].icon} ${basisLabel}.`;
  const hasQuickReset = search.trim().length > 0 || hasPrimaryFilters || hasSecondaryFilters;

  useEffect(() => {
    function onResize() {
      setIsWideMobile(window.innerWidth >= 360);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (bp === "tablet") setRailOpen(false);
    if (bp === "desktop") setRailOpen(true);
  }, [bp]);

  const clearSortHelpTimer = () => {
    if (sortHelpTimerRef.current !== null) {
      window.clearTimeout(sortHelpTimerRef.current);
      sortHelpTimerRef.current = null;
    }
  };

  const openSortHelp = () => {
    clearSortHelpTimer();
    sortHelpTimerRef.current = window.setTimeout(() => {
      setShowSortHelp(true);
      sortHelpTimerRef.current = null;
    }, SORT_HELP_DELAY_MS);
  };

  const closeSortHelp = () => {
    clearSortHelpTimer();
    setShowSortHelp(false);
  };

  useEffect(() => () => clearSortHelpTimer(), []);


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

  const uniqueCountries = useMemo(() => new Set(trips.flatMap((t) => t.allCountries.map((c) => c.name))).size, [trips]);
  const totalVisited = useMemo(() => new Set(trips.flatMap((t) => t.allCountries.filter((c) => visitedNames.has(c.name)).map((c) => c.name))).size, [trips, visitedNames]);
  const tripsCompleted = useMemo(() => trips.filter((t) => t.allVisited).length, [trips]);

  // Group filtered trips into sections
  const favoriteTrips = useMemo(() => filtered.filter((t) => t.isFavorited && !t.allVisited), [filtered]);
  const planning = useMemo(() => filtered.filter((t) => !t.isFavorited && !t.allVisited), [filtered]);
  const completed = useMemo(() => filtered.filter((t) => t.allVisited), [filtered]);

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
  const uniqueRegions = useMemo(() => new Set(trips.map((t) => t.region)).size, [trips]);

  const handleSave = (originalMain: string | null, group: TripGroupDef) => {
    onSaveTrip(originalMain, group);
    setEditingMain(null);
    setCreatingNew(false);
  };

  const handleReset = async (main: string) => {
    const ok = await confirm({
      title: "Reset to defaults?",
      message: "Your customizations will be removed and the trip will revert to its original configuration.",
      confirmLabel: "Reset",
      variant: "warning",
    });
    if (!ok) return;
    onDeleteTrip(main);
    setEditingMain(null);
  };

  const renderTripsContent = (widthClass: string) => (
    <div className={`${widthClass} mx-auto space-y-6`}>
      {creatingNew && !isMobile && (
        <div className="mb-4">
          <TripEditor
            initial={null}
            allCountryNames={countries.map((c) => c.name)}
            countryRegionMap={Object.fromEntries(countries.filter((c) => c.region).map((c) => [c.name, c.region!]))}
            assignedNames={assignedNames}
            currentTripNames={[]}
            onSave={(group) => handleSave(null, group)}
            onCancel={() => setCreatingNew(false)}
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

  // On mobile, the editing trip's TripEditor renders in a bottom drawer portal
  const editingTrip = editingMain ? trips.find((t) => t.main.name === editingMain) : null;
  const mobileEditorContent = isMobile ? (
    creatingNew ? (
      <TripEditor
        initial={null}
        allCountryNames={countries.map((c) => c.name)}
        countryRegionMap={Object.fromEntries(countries.filter((c) => c.region).map((c) => [c.name, c.region!]))}
        assignedNames={assignedNames}
        currentTripNames={[]}
        onSave={(group) => handleSave(null, group)}
        onCancel={() => setCreatingNew(false)}
      />
    ) : editingTrip ? (
      <TripEditor
        initial={{
          main: editingTrip.main.name,
          addOns: editingTrip.addOns.map((c) => c.name),
          region: editingTrip.region,
        }}
        isSeedTrip={editingTrip.source === "group" && !editingTrip.isCustom}
        allCountryNames={countries.map((c) => c.name)}
        countryRegionMap={Object.fromEntries(countries.filter((c) => c.region).map((c) => [c.name, c.region!]))}
        assignedNames={assignedNames}
        currentTripNames={editingTrip.allCountries.map((c) => c.name)}
        onSave={(group) => handleSave(editingTrip.main.name, group)}
        onCancel={() => setEditingMain(null)}
        onReset={editingTrip.isCustom ? () => handleReset(editingTrip.main.name) : undefined}
      />
    ) : null
  ) : null;

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="border-b bg-white shrink-0">
        {/* Mobile: modern compact header */}
        <div className="md:hidden px-3 py-2.5 space-y-2">
          {/* Row 1: Search + action buttons */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search destinations…"
                className="w-full pl-8 pr-8 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50/80 focus:bg-white focus:border-blue-300 focus:outline-none transition-colors"
              />
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm p-0.5 focus-ring rounded"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={() => setStatsOpen((o) => !o)}
              className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors focus-ring ${
                statsOpen ? "bg-blue-50 text-blue-600 border border-blue-200" : "text-gray-500 border border-gray-200 hover:bg-gray-50"
              }`}
              aria-label="View stats"
              aria-expanded={statsOpen}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 3v18h18"/><path d="M7 16V8"/><path d="M11 16V11"/><path d="M15 16V5"/><path d="M19 16V9"/></svg>
            </button>
          </div>

          {/* Row 2: Filter chip + sort + layout + count */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setMobileFiltersOpen((o) => !o)}
              className={`relative shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all focus-ring ${
                mobileFiltersOpen || activeFilterCount > 0
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              aria-label="Toggle filters"
              aria-expanded={mobileFiltersOpen}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M3 4h18l-7 8v5l-4 2V12z"/></svg>
              Filters
              {activeFilterCount > 0 && (
                <span className={`ml-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${
                  mobileFiltersOpen ? "bg-white/25 text-white" : "bg-blue-600 text-white"
                }`}>
                  {activeFilterCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setSortMode(sortMode === "popular" ? "az" : sortMode === "az" ? "za" : "popular")}
              className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors focus-ring"
              aria-label="Sort trips"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M3 7h6M3 12h10M3 17h14"/></svg>
              {sortMode === "popular" ? "Popular" : sortMode === "az" ? "A→Z" : "Z→A"}
            </button>

            {canUseMobileGrid && (
              <button
                onClick={() => setLayout(layout === "grid" ? "list" : "grid")}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors focus-ring"
                aria-label={layout === "grid" ? "Switch to list" : "Switch to grid"}
              >
                <span className="text-xs">{layout === "grid" ? "≡" : "▦"}</span>
              </button>
            )}

            <span className="ml-auto text-[10px] text-gray-400 font-medium tabular-nums">
              {filtered.length}/{trips.length}
            </span>
          </div>

          {/* Expandable unified filter panel */}
          {mobileFiltersOpen && (
            <div className="rounded-2xl border border-gray-200 bg-gradient-to-b from-gray-50 to-white p-3 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-700">Filters</p>
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => {
                      setMonth([]); setBudgetBasis("couple"); setBudgetFilter("all"); setVisitedFilter("all");
                      setViewMode("all"); setVisitedMode("all"); setRegionFilter("all");
                    }}
                    className="text-[10px] font-semibold text-red-500 hover:text-red-600 focus-ring rounded px-1"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Month */}
              <div>
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Month</p>
                <div className="grid grid-cols-4 gap-1">
                  {MONTHS.map((m) => (
                    <button
                      key={m}
                      onClick={() => setMonth(selectedMonth.includes(m) ? selectedMonth.filter((x) => x !== m) : [...selectedMonth, m])}
                      className={`py-1.5 rounded-lg text-[10px] font-semibold transition-colors focus-ring ${
                        selectedMonth.includes(m)
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div>
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Budget</p>
                <div className="flex items-center gap-1 mb-1.5">
                  {BUDGET_BASIS_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setBudgetBasis(value)}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-semibold transition-colors focus-ring ${
                        budgetBasis === value
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-white text-gray-600 border border-gray-200"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  {BUDGET_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setBudgetFilter(budgetFilter === value ? "all" : value)}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-semibold transition-colors focus-ring ${
                        budgetFilter === value
                          ? "bg-amber-500 text-white shadow-sm"
                          : "bg-white text-gray-600 border border-gray-200"
                      }`}
                    >
                      {label.replace("₹₹₹ Premium", "Premium").replace("₹₹ Mid", "Mid").replace("₹ Budget", "Budget")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visited + View + Status in a compact 2-col grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Visited</p>
                  <div className="space-y-1">
                    {[
                      { value: "all", label: "All" },
                      { value: "unvisited", label: "Not visited" },
                      { value: "visited", label: "Visited" },
                    ].map((item) => (
                      <button
                        key={item.value}
                        onClick={() => setVisitedFilter(item.value as VisitedFilter)}
                        className={`w-full py-1 rounded-lg text-[10px] font-semibold transition-colors focus-ring ${
                          visitedFilter === item.value
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-white text-gray-600 border border-gray-200"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Status</p>
                  <div className="space-y-1">
                    {["all", "completed", "in-progress", "not-started"].map((m) => (
                      <button
                        key={m}
                        onClick={() => setVisitedMode(m as VisitedMode)}
                        className={`w-full py-1 rounded-lg text-[10px] font-semibold transition-colors focus-ring ${
                          visitedMode === m
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-white text-gray-600 border border-gray-200"
                        }`}
                      >
                        {m === "all" ? "All" : m === "completed" ? "Done" : m === "in-progress" ? "In progress" : "Not started"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* View + Region row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">View</p>
                  <div className="space-y-1">
                    {["all", "combo", "solo"].map((m) => (
                      <button
                        key={m}
                        onClick={() => setViewMode(m as ViewMode)}
                        className={`w-full py-1 rounded-lg text-[10px] font-semibold transition-colors focus-ring ${
                          viewMode === m
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-white text-gray-600 border border-gray-200"
                        }`}
                      >
                        {m === "all" ? "All" : m === "combo" ? "Combo" : "Solo"}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Region</p>
                  <select
                    value={regionFilter}
                    onChange={(e) => setRegionFilter(e.target.value as Region | "all")}
                    className="w-full px-2 py-1.5 rounded-lg text-[10px] font-semibold border border-gray-200 bg-white text-gray-700 focus-ring"
                  >
                    <option value="all">All regions</option>
                    {ALL_REGIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
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
              <button onClick={() => setStatsOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 focus-ring rounded" aria-label="Close stats">✕</button>
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
            <aside className="w-72 lg:w-80 shrink-0 border-r border-gray-200 bg-gradient-to-b from-white to-slate-50/50 overflow-y-auto p-4 space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Filters</p>
                <button
                  onClick={() => setRailOpen(false)}
                  className="px-2 py-1 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 focus-ring"
                  aria-label="Hide filters"
                >
                  ⟨
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 mb-1.5">Month</p>
                  <div className="grid grid-cols-4 gap-1">
                    {MONTHS.map((m) => (
                      <button
                        key={m}
                        onClick={() => setMonth(selectedMonth.includes(m) ? selectedMonth.filter((x) => x !== m) : [...selectedMonth, m])}
                        className={`py-1.5 rounded-lg text-[10px] font-semibold focus-ring ${
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
                  <p className="text-[11px] font-semibold text-gray-500 mb-1.5">Budget + travelers</p>
                  <div className="grid grid-cols-3 gap-1 mb-1.5">
                    {BUDGET_BASIS_OPTIONS.map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => setBudgetBasis(value)}
                        className={`py-1.5 rounded-lg text-[10px] font-semibold focus-ring ${
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
                        className={`w-full px-3 py-2 rounded-xl text-left transition-colors focus-ring ${
                          budgetFilter === value ? "bg-amber-50 text-amber-800 border border-amber-200 shadow-sm" : "bg-white text-gray-600 border border-gray-100 hover:bg-gray-50 hover:border-gray-200"
                        }`}
                      >
                        <p className="text-[11px] font-semibold">{label}</p>
                        <p className="text-[10px] opacity-70">{desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-gray-500 mb-1.5">Visited</p>
                  <select
                    value={visitedFilter}
                    onChange={(e) => setVisitedFilter(e.target.value as VisitedFilter)}
                    className="w-full px-2.5 py-2 rounded-lg text-xs font-semibold border border-gray-200 bg-white text-gray-700 focus-ring"
                    aria-label="Visited filter"
                  >
                    <option value="all">All countries</option>
                    <option value="unvisited">Not visited</option>
                    <option value="visited">Visited</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 space-y-3">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Trip filters</p>
                <select
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value as ViewMode)}
                  className="w-full px-2.5 py-2 rounded-lg text-xs font-semibold border border-gray-200 bg-white text-gray-700 focus-ring"
                  aria-label="Trip type"
                >
                  <option value="all">All trips</option>
                  <option value="combo">Combo trips</option>
                  <option value="solo">Solo trips</option>
                </select>
                <select
                  value={visitedMode}
                  onChange={(e) => setVisitedMode(e.target.value as VisitedMode)}
                  className="w-full px-2.5 py-2 rounded-lg text-xs font-semibold border border-gray-200 bg-white text-gray-700 focus-ring"
                  aria-label="Trip progress"
                >
                  <option value="all">All status</option>
                  <option value="completed">Completed</option>
                  <option value="in-progress">In progress</option>
                  <option value="not-started">Not started</option>
                </select>
                <select
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value as Region | "all")}
                  className="w-full px-2.5 py-2 rounded-lg text-xs font-semibold border border-gray-200 bg-white text-gray-700 focus-ring"
                  aria-label="Region filter"
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
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors focus-ring"
                  >
                    Clear all filters
                  </button>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-3.5 space-y-2.5 shadow-sm">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Stats</p>
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
                className="w-7 h-7 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 focus-ring"
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
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm p-0.5 focus-ring rounded"
                        aria-label="Clear search"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setLayout("list")}
                      className={`px-2.5 py-2 text-sm leading-none focus-ring ${layout === "list" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"}`}
                      aria-label="List view"
                    >
                      ≡
                    </button>
                    <button
                      onClick={() => setLayout("grid")}
                      className={`px-2.5 py-2 text-sm leading-none border-l border-gray-200 focus-ring ${layout === "grid" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"}`}
                      aria-label="Grid view"
                    >
                      ▦
                    </button>
                  </div>

                  <div
                    className="relative"
                    onMouseEnter={openSortHelp}
                    onMouseLeave={closeSortHelp}
                    onFocusCapture={openSortHelp}
                    onBlurCapture={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                        closeSortHelp();
                      }
                    }}
                  >
                    <select
                      value={sortMode}
                      onChange={(e) => { closeSortHelp(); setSortMode(e.target.value as SortMode); }}
                      onMouseDown={closeSortHelp}
                      className="px-2.5 py-2 text-xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-700"
                      aria-label="Sort trips"
                    >
                      <option value="popular">Sort: Popularity</option>
                      <option value="az">Sort: A to Z</option>
                      <option value="za">Sort: Z to A</option>
                    </select>
                    {showSortHelp && (
                      <div
                        role="tooltip"
                        className="pointer-events-none absolute left-1/2 top-full mt-1.5 w-64 -translate-x-1/2 rounded-lg bg-gray-900 px-2.5 py-2 text-[10px] leading-snug text-white shadow-xl z-20"
                      >
                        {sortHelpText}
                      </div>
                    )}
                  </div>

                  <span className="text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2">
                    {filtered.length} of {trips.length}
                  </span>

                  {hasQuickReset && (
                    <button
                      onClick={() => {
                        setSearch("");
                        setMonth([]);
                        setBudgetBasis("couple");
                        setBudgetFilter("all");
                        setVisitedFilter("all");
                        setViewMode("all");
                        setVisitedMode("all");
                        setRegionFilter("all");
                      }}
                      className="px-2.5 py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                      Clear all
                    </button>
                  )}

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
      {isEnabled("tripGroups") && !creatingNew && !editingMain && (
        <button
          onClick={() => { setCreatingNew(true); setEditingMain(null); }}
          className="md:hidden fixed bottom-5 right-5 z-30 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center text-2xl focus-ring"
          aria-label="New Trip"
        >
          +
        </button>
      )}

      {/* Mobile bottom drawer for trip editor */}
      {isMobile && (editingMain || creatingNew) && createPortal(
        <div
          className="fixed inset-0 z-[9998] flex items-end bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) { setEditingMain(null); setCreatingNew(false); } }}
          role="dialog"
          aria-label={creatingNew ? "Create new trip" : "Edit trip"}
          aria-modal="true"
        >
          <div
            className="w-full max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl animate-[slideUp_0.2s_ease-out] safe-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <div className="sticky top-0 z-10 flex justify-between items-center px-4 pt-3 pb-1 bg-white border-b border-gray-100">
              <p className="text-xs font-bold text-gray-700">{creatingNew ? "New Trip" : "Edit Trip"}</p>
              <button
                onClick={() => { setEditingMain(null); setCreatingNew(false); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus-ring"
                aria-label="Close editor"
              >
                ✕
              </button>
            </div>
            {mobileEditorContent}
          </div>
        </div>,
        document.body,
      )}

      <ConfirmDialog />
    </div>
  );

  function renderTripCards(tripList: Trip[]) {
    const countryByName = new Map(countries.map((country) => [country.name, country]));
    return (
      <div className={effectiveLayout === "grid" ? "grid grid-cols-2 lg:grid-cols-3 gap-3" : "grid gap-3"}>
        {tripList.map((trip) =>
          editingMain === trip.main.name && !isMobile ? (
            <TripEditor
              key={trip.id}
              initial={{
                main: trip.main.name,
                addOns: trip.addOns.map((c) => c.name),
                region: trip.region,
              }}
              isSeedTrip={trip.source === "group" && !trip.isCustom}
              allCountryNames={countries.map((c) => c.name)}
              countryRegionMap={Object.fromEntries(countries.filter((c) => c.region).map((c) => [c.name, c.region!]))}
              assignedNames={assignedNames}
              currentTripNames={trip.allCountries.map((c) => c.name)}
              onSave={(group) => handleSave(trip.main.name, group)}
              onCancel={() => setEditingMain(null)}
              onReset={trip.isCustom ? () => handleReset(trip.main.name) : undefined}
            />
          ) : (
            <TripRow
              key={trip.id}
              trip={trip}
              budgetBasis={budgetBasis}
              visitedNames={visitedNames}
              favorites={favorites}
              countryByName={countryByName}
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
  isSeedTrip,
  allCountryNames,
  countryRegionMap,
  assignedNames,
  currentTripNames,
  onSave,
  onCancel,
  onReset,
}: {
  initial: TripGroupDef | null;
  isSeedTrip?: boolean;
  allCountryNames: string[];
  countryRegionMap: Record<string, string>;
  assignedNames: Set<string>;
  currentTripNames: string[];
  onSave: (group: TripGroupDef) => void;
  onCancel: () => void;
  onReset?: () => void;
}) {
  const mainLocked = !!isSeedTrip && !!initial;
  const [main, setMain] = useState(initial?.main ?? "");
  const [addOns, setAddOns] = useState<string[]>(initial?.addOns ?? []);
  const [region, setRegion] = useState<Region>(initial?.region ?? (countryRegionMap[initial?.main ?? ""] as Region) ?? "Asia");
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

  // Dirty check: don't save if nothing changed (avoids marking seed trips as custom)
  const isDirty = !initial ||
    main !== initial.main ||
    region !== initial.region ||
    addOns.length !== (initial.addOns?.length ?? 0) ||
    addOns.some((a, i) => a !== initial.addOns?.[i]);

  // If main is changed and was an add-on, remove it
  const handleMainChange = (newMain: string) => {
    setMain(newMain);
    setAddOns((prev) => prev.filter((n) => n !== newMain));
    if (countryRegionMap[newMain]) {
      setRegion(countryRegionMap[newMain] as Region);
    }
  };

  return (
    <div
      className="rounded-xl border-2 border-blue-300 bg-blue-50/50 p-4 space-y-3"
      tabIndex={-1}
      ref={(el) => el?.focus()}
      onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); onCancel(); } }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="text-xs font-bold text-blue-700">
          {initial ? (mainLocked ? "Customize Trip" : "Edit Trip") : "New Trip"}
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {onReset && (
            <button
              onClick={onReset}
              className="text-[10px] font-medium text-amber-600 hover:text-amber-700 px-2 py-1 rounded hover:bg-amber-50 transition-colors"
            >
              ↩ Reset
            </button>
          )}
          <button
            onClick={onCancel}
            className="text-[10px] font-medium text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => canSave && isDirty && onSave({ main, addOns, region })}
            disabled={!canSave || !isDirty}
            className={`text-[10px] font-semibold px-3 py-1 rounded-lg transition-colors ${
              canSave && isDirty
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            Save
          </button>
        </div>
      </div>

      <div className={mainLocked ? "grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3" : "grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3"}>
        {/* Main country */}
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
            Main Country
          </label>
          {mainLocked ? (
            <div className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50 text-gray-600 font-medium">
              {main}
            </div>
          ) : (
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
          )}
        </div>

        {/* Region — hidden for seed trips (auto-derived) */}
        {!mainLocked && (
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
        )}

        {/* Add-on count badge */}
        <div className="flex items-end pb-0.5">
          <span className="text-[10px] font-medium text-gray-400">
            {addOns.length}/2 add-ons
          </span>
        </div>
      </div>

      {/* Add-on selector */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
            Add-on Countries (max 2)
          </label>
          {addOns.length > 0 && (
            <button
              onClick={() => setAddOns([])}
              className="text-[10px] font-medium text-gray-400 hover:text-gray-600 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
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
        className="flex items-center gap-2 mb-3 w-full text-left group focus-ring rounded-lg px-1 -mx-1"
        aria-expanded={open}
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

const BUDGET_BASIS_META: Record<BudgetBasis, { icon: string; label: string }> = {
  solo: { icon: "👤", label: "per solo traveler" },
  couple: { icon: "👫", label: "per couple" },
  family4: { icon: "👨‍👩‍👧‍👦", label: "per family of 4" },
};

function TripRow({
  trip,
  budgetBasis,
  visitedNames,
  favorites,
  countryByName,
  onSelect,
  onEdit,
  compact,
}: {
  trip: Trip;
  budgetBasis: BudgetBasis;
  visitedNames: Set<string>;
  favorites: Set<string>;
  countryByName: Map<string, Country>;
  onSelect: (c: Country) => void;
  onEdit?: () => void;
  compact?: boolean;
}) {
  const isCombo = trip.addOns.length > 0;
  const suggestedPairs = !isCombo && !trip.allVisited ? (trip.main.combo ?? []).slice(0, 2) : [];
  const budgetDisplay = trip.main.budgetBreakdown?.[budgetBasis] ?? trip.main.budget;
  const budgetBasisMeta = BUDGET_BASIS_META[budgetBasis];
  const progress = trip.allCountries.length > 0
    ? Math.round((trip.visitedCount / trip.allCountries.length) * 100)
    : 0;

  // Build search queries for images — landmark first, then first experience/city as a stronger fallback.
  const imageQueries = trip.allCountries.slice(0, 3).map((c) => {
    const anchor = c.landmark ?? c.experiences?.[0] ?? c.cities?.[0]?.name;
    return anchor ? `${anchor} ${c.name}` : `${c.name} travel landmark`;
  });

  const accent = REGION_ACCENT[trip.region] ?? "border-l-slate-300";

  return (
    <article
      onClick={() => onSelect(trip.main)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(trip.main); } }}
      tabIndex={0}
      className={`rounded-xl border border-l-[3px] overflow-hidden transition-all group cursor-pointer focus-ring ${accent} ${
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
              aria-label={`Open ${trip.main.name}`}
              className="text-sm font-bold text-gray-800 hover:text-blue-600 transition-colors truncate"
            >
              {trip.allVisited ? "✅ " : ""}{trip.main.name}
            </button>
           <div className="flex items-center gap-1 shrink-0 ml-1">
             {onEdit && (
               <button
                 onClick={(e) => { e.stopPropagation(); onEdit(); }}
                 className="text-[11px] text-gray-400 hover:text-blue-600 px-1.5 py-1 rounded hover:bg-blue-50 transition-all focus-ring"
                 aria-label="Edit trip"
               >
                 ✏️
               </button>
             )}
             <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${REGION_BADGE[trip.region] ?? "bg-gray-50 text-gray-400"}`}>
               {trip.region}
             </span>
             {trip.isCustom && (
               <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-violet-50 text-violet-500 border border-violet-100">
                 🏷 Custom
               </span>
             )}
           </div>
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
                    <button
                      key={name}
                      onClick={(e) => {
                        e.stopPropagation();
                        const match = countryByName.get(name);
                        if (match) onSelect(match);
                      }}
                      className="text-[10px] font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                    >
                      {name}
                    </button>
                  ))}
                </>
              ) : (
                <span className="text-[10px] font-medium text-gray-300 bg-transparent px-2 py-0.5 rounded-full border border-dashed border-gray-200">
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
            aria-label={`Open ${trip.main.name}`}
            className="text-sm font-bold text-gray-800 hover:text-blue-600 transition-colors truncate"
          >
            {trip.main.name}
          </button>
          <span className={`shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded ${REGION_BADGE[trip.region] ?? "bg-gray-50 text-gray-400"}`}>
            {trip.region}
          </span>
          {trip.isCustom && (
            <span className="shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded bg-violet-50 text-violet-500 border border-violet-100">
              🏷 Custom
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="md:opacity-0 md:group-hover:opacity-100 text-[11px] text-gray-400 hover:text-blue-600 px-1.5 py-0.5 rounded hover:bg-blue-50 transition-all"
              aria-label="Edit trip"
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
            <span
              className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full"
              title={`Budget ${budgetBasisMeta.label}`}
            >
              {budgetBasisMeta.icon} {budgetDisplay}
            </span>
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
            <button
              key={name}
              onClick={(e) => {
                e.stopPropagation();
                const match = countryByName.get(name);
                if (match) onSelect(match);
              }}
              className="text-[10px] font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            >
              {name}
            </button>
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
    </article>
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
