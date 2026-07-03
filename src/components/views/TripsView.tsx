import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import type { Country, VisitedFilter } from "../../core/types";
import { type BudgetBasis, type BudgetTier } from "../../core/utils/filterLogic";
import { BUDGET_BASIS_ORDER, BUDGET_BASIS_META } from "../../core/utils/budget";
import { MONTHS } from "../../core/utils/months";
import { ALL_REGIONS, type Region, type TripGroupDef } from "../../core/data/tripGroups";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { isEnabled } from "../../core/featureFlags";
import { fuzzySearchTrips } from "../../utils/fuzzySearch";
import { useConfirm } from "../shared/ConfirmDialog";
import { createPortal } from "react-dom";
import { buildTrips, type Trip } from "./trips/types";
import TripCard from "./trips/TripCard";
import TripEditor from "./trips/TripEditor";
import { PaginatedTripSection } from "./trips/TripSection";

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
  defaultBasis: BudgetBasis;
  onSelect: (c: Country) => void;
  tripGroups: TripGroupDef[];
  onSaveTrip: (originalMain: string | null, group: TripGroupDef) => void;
  onDeleteTrip: (main: string) => void;
};

type ViewMode = "all" | "combo" | "solo";
type VisitedMode = "all" | "completed" | "in-progress" | "not-started";
type SortMode = "popular" | "az" | "za";
const SORT_HELP_DELAY_MS = 120;

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
  defaultBasis,
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

const BUDGET_BASIS_OPTIONS: { value: BudgetBasis; label: string }[] = BUDGET_BASIS_ORDER.map(
  (value) => ({ value, label: BUDGET_BASIS_META[value].label }),
);

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
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const sortHelpTimerRef = useRef<number | null>(null);
  const [confirm, ConfirmDialog] = useConfirm();
  const canUseMobileGrid = isMobile && isWideMobile;
  const effectiveLayout: "list" | "grid" = isMobile ? (canUseMobileGrid ? layout : "list") : layout;

  const countryByName = useMemo(
    () => new Map(countries.map((country) => [country.name, country])),
    [countries]
  );
  const handleEditTrip = useCallback((mainName: string) => {
    setEditingMain(mainName);
    setCreatingNew(false);
  }, []);

  const hasPrimaryFilters = selectedMonth.length > 0 || budgetFilter !== "all" || visitedFilter !== "all";
  const hasSecondaryFilters = viewMode !== "all" || visitedMode !== "all" || regionFilter !== "all";
  const secondaryFilterCount = (viewMode !== "all" ? 1 : 0) + (visitedMode !== "all" ? 1 : 0) + (regionFilter !== "all" ? 1 : 0);
  const advancedExpanded = advancedOpen || hasSecondaryFilters;
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
              className={`relative shrink-0 flex items-center gap-1 px-3 py-1.5 min-h-[32px] rounded-full text-[11px] font-semibold transition-colors focus-ring ${
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
              className="shrink-0 flex items-center gap-1 px-3 py-1.5 min-h-[32px] rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors focus-ring"
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
                      setMonth([]); setBudgetBasis(defaultBasis); setBudgetFilter("all"); setVisitedFilter("all");
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
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={uniqueCountries > 0 ? Math.round((totalVisited / uniqueCountries) * 100) : 0} aria-label="Countries visited">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-[width] duration-500"
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
                className="w-full mt-3 flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded-lg text-white transition-colors"
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
                <button
                  onClick={() => setAdvancedOpen((o) => !o)}
                  className="w-full min-h-[32px] flex items-center justify-between text-xs font-bold text-gray-600 uppercase tracking-wider focus-ring rounded-lg px-1 hover:text-gray-800 transition-colors"
                  aria-expanded={advancedExpanded}
                  aria-controls="trips-advanced-filters"
                >
                  <span className="flex items-center gap-1.5">
                    Trip filters
                    {secondaryFilterCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center normal-case tracking-normal">
                        {secondaryFilterCount}
                      </span>
                    )}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`text-sm text-gray-400 transition-transform ${advancedExpanded ? "rotate-90" : ""}`}
                  >
                    ⟩
                  </span>
                </button>
                {advancedExpanded && (
                  <div id="trips-advanced-filters" className="space-y-3">
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
                  </div>
                )}
                {(selectedMonth.length > 0 || budgetFilter !== "all" || budgetBasis !== defaultBasis || visitedFilter !== "all" || hasSecondaryFilters) && (
                  <button
                    onClick={() => {
                      setMonth([]);
                      setBudgetBasis(defaultBasis);
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
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={uniqueCountries > 0 ? Math.round((totalVisited / uniqueCountries) * 100) : 0} aria-label="Countries visited">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-[width] duration-500"
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
                        setBudgetBasis(defaultBasis);
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
          className="md:hidden fixed bottom-5 right-5 z-30 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 active:scale-95 transition flex items-center justify-center text-2xl focus-ring"
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
            <TripCard
              key={trip.id}
              trip={trip}
              budgetBasis={budgetBasis}
              visitedNames={visitedNames}
              favorites={favorites}
              countryByName={countryByName}
              onSelect={onSelect}
              compact={effectiveLayout === "grid"}
              onEdit={trip.source === "group" ? handleEditTrip : undefined}
            />
          ),
        )}
      </div>
    );
  }
}
