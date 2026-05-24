import { useMemo, useState, useEffect } from "react";
import type { Country, VisitedFilter } from "../../types";
import { ALL_REGIONS, type Region, type TripGroupDef } from "../../data/tripGroups";
import { getWikiImage } from "../../utils/wikiImages";
import PillGroup from "../shared/PillGroup";

type Props = {
  countries: Country[];
  visitedNames: Set<string>;
  favorites: Set<string>;
  visitedFilter?: VisitedFilter;
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

function buildTrips(
  allCountries: Country[],
  tripGroups: TripGroupDef[],
  visitedNames: Set<string>,
  favorites: Set<string>,
): Trip[] {
  const byName = new Map(allCountries.map((c) => [c.name, c]));
  const assigned = new Set<string>();
  const trips: Trip[] = [];
  let nextId = 0;

  for (const group of tripGroups) {
    const main = byName.get(group.main);
    if (!main) continue;

    const addOns = group.addOns
      .map((n) => byName.get(n))
      .filter((c): c is Country => c !== undefined);

    const all = [main, ...addOns];
    const vCount = all.filter((c) => visitedNames.has(c.name)).length;
    trips.push({
      id: nextId++,
      main,
      addOns,
      allCountries: all,
      visitedCount: vCount,
      allVisited: vCount === all.length,
      noneVisited: vCount === 0,
      isFavorited: all.some((c) => favorites.has(c.name)),
      region: group.region,
      source: "group",
    });
    for (const c of all) assigned.add(c.name);
  }

  for (const c of allCountries) {
    if (assigned.has(c.name)) continue;
    const isV = visitedNames.has(c.name);
    trips.push({
      id: nextId++,
      main: c,
      addOns: [],
      allCountries: [c],
      visitedCount: isV ? 1 : 0,
      allVisited: isV,
      noneVisited: !isV,
      isFavorited: favorites.has(c.name),
      region: "Asia",
      source: "solo",
    });
  }

  return trips;
}

export default function TripsView({
  countries,
  visitedNames,
  favorites,
  visitedFilter = "all",
  onSelect,
  tripGroups,
  onSaveTrip,
  onDeleteTrip,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [visitedMode, setVisitedMode] = useState<VisitedMode>("all");
  const [regionFilter, setRegionFilter] = useState<Region | "all">("all");
  const [search, setSearch] = useState("");
  const [editingMain, setEditingMain] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [layout, setLayout] = useState<"list" | "grid">("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const hasFilters = viewMode !== "all" || visitedMode !== "all" || regionFilter !== "all";

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

    // Global visited filter — show trip if ANY country in it matches
    if (visitedFilter === "visited") result = result.filter((t) => t.allCountries.some((c) => visitedNames.has(c.name)));
    if (visitedFilter === "unvisited") result = result.filter((t) => t.allCountries.some((c) => !visitedNames.has(c.name)));

    if (regionFilter !== "all") result = result.filter((t) => t.region === regionFilter);

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t) =>
        t.allCountries.some((c) => c.name.toLowerCase().includes(q))
      );
    }

    // Sort: favorites first → unvisited middle → visited last
    result = [...result].sort((a, b) => {
      if (a.isFavorited !== b.isFavorited) return a.isFavorited ? -1 : 1;
      if (a.allVisited !== b.allVisited) return a.allVisited ? 1 : -1;
      return 0;
    });

    return result;
  }, [trips, viewMode, visitedMode, visitedFilter, visitedNames, regionFilter, search]);

  const comboTrips = trips.filter((t) => t.addOns.length > 0);
  const soloTrips = trips.filter((t) => t.addOns.length === 0);
  const totalCountries = trips.reduce((s, t) => s + t.allCountries.length, 0);
  const totalVisited = trips.reduce((s, t) => s + t.visitedCount, 0);
  const tripsCompleted = trips.filter((t) => t.allVisited).length;
  const completionPct = trips.length > 0 ? Math.round((tripsCompleted / trips.length) * 100) : 0;

  // Group filtered trips into sections
  const favoriteTrips = filtered.filter((t) => t.isFavorited && !t.allVisited);
  const planning = filtered.filter((t) => !t.isFavorited && !t.allVisited);
  const completed = filtered.filter((t) => t.allVisited);

  // Next trip highlight — top favorited unvisited
  const nextTrip = trips.find((t) => t.isFavorited && !t.allVisited) ?? trips.find((t) => !t.allVisited);

  // Unique continents visited
  const continentsVisited = new Set(trips.filter((t) => t.visitedCount > 0).map((t) => t.region)).size;

  const handleSave = (originalMain: string | null, group: TripGroupDef) => {
    onSaveTrip(originalMain, group);
    setEditingMain(null);
    setCreatingNew(false);
  };

  const handleDelete = (main: string) => {
    onDeleteTrip(main);
    setEditingMain(null);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
      {/* Dashboard stats */}
      <div className="px-5 py-4 bg-white border-b shrink-0">
        <div className="max-w-5xl mx-auto flex items-center gap-6">
          {/* Progress ring */}
          <div className="relative w-16 h-16 shrink-0">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e2e8f0" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#3b82f6" strokeWidth="3"
                strokeDasharray={`${completionPct} ${100 - completionPct}`}
                strokeLinecap="round" className="transition-all duration-500" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-slate-700">
              {completionPct}%
            </span>
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-5 flex-1 flex-wrap">
            <DashStat value={totalCountries} label="countries" icon="🌍" />
            <DashStat value={totalVisited} label="visited" icon="✅" />
            <DashStat value={continentsVisited} label="regions" icon="🗺" />
            <DashStat value={comboTrips.length} label="combo trips" icon="🔗" />
            <DashStat value={soloTrips.length} label="solo" icon="📍" />
          </div>

          {/* Next trip highlight */}
          {nextTrip && (
            <div className="shrink-0 hidden sm:flex items-center gap-2.5 px-4 py-2.5 bg-blue-50 rounded-xl border border-blue-100">
              <span className="text-lg">🎯</span>
              <div>
                <p className="text-[9px] font-bold text-blue-500 uppercase tracking-wider">Next trip</p>
                <p className="text-xs font-bold text-slate-700">{nextTrip.main.name}</p>
              </div>
            </div>
          )}

          <button
            onClick={() => { setCreatingNew(true); setEditingMain(null); }}
            className="shrink-0 flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            + New Trip
          </button>
        </div>
      </div>

      {/* Filter bar — compact: search + filter toggle + layout */}
      <div className="flex items-center gap-2 px-5 py-2 border-b bg-white shrink-0">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search countries…"
          className="w-44 px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-300 focus:outline-none transition-colors"
        />

        <button
          onClick={() => setFiltersOpen((o) => !o)}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg transition-colors ${
            filtersOpen || hasFilters
              ? "bg-blue-50 text-blue-700 border border-blue-200"
              : "text-gray-500 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          🔍 Filters
          {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
        </button>

        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setViewMode("all"); setVisitedMode("all"); setRegionFilter("all"); }}
            className="text-[10px] text-red-500 hover:text-red-700 font-medium"
          >
            Clear
          </button>
        )}

        <div className="ml-auto shrink-0 flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => setLayout("list")} title="List view"
            className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${layout === "list" ? "bg-white text-blue-700 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>
            ☰
          </button>
          <button onClick={() => setLayout("grid")} title="Grid view"
            className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${layout === "grid" ? "bg-white text-blue-700 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>
            ▦
          </button>
        </div>
      </div>

      {/* Expandable filter panel */}
      {filtersOpen && (
        <div className="flex items-center gap-3 px-5 py-2 border-b bg-slate-50 shrink-0 overflow-x-auto">
          <PillGroup
            options={[
              { key: "all", label: "All" },
              { key: "combo", label: "Combo" },
              { key: "solo", label: "Solo" },
            ]}
            value={viewMode}
            onChange={(v) => setViewMode(v as ViewMode)}
          />

          <div className="h-5 w-px bg-gray-200 shrink-0" />

          <PillGroup
            options={[
              { key: "all", label: "Any" },
              { key: "not-started", label: "Not Started" },
              { key: "in-progress", label: "In Progress" },
              { key: "completed", label: "Completed" },
            ]}
            value={visitedMode}
            onChange={(v) => setVisitedMode(v as VisitedMode)}
          />

          <div className="h-5 w-px bg-gray-200 shrink-0" />

          <PillGroup
            options={[
              { key: "all", label: "🌍 All" },
              ...ALL_REGIONS.map((r) => ({ key: r, label: r })),
            ]}
            value={regionFilter}
            onChange={(v) => setRegionFilter(v as Region | "all")}
          />
        </div>
      )}

      {/* Trip cards — grouped by section */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Create new trip form */}
          {creatingNew && (
            <div className="mb-4">
              <TripEditor
                initial={null}
                allCountryNames={countries.map((c) => c.name)}
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
              Showing {filtered.length} of {trips.length} trips
            </p>
          )}

          {/* ⭐ Favorites */}
          {favoriteTrips.length > 0 && (
            <PaginatedTripSection icon="⭐" label="Favorites" count={favoriteTrips.length} color="text-yellow-600"
              trips={favoriteTrips} renderCards={renderTripCards} pageSize={layout === "grid" ? 6 : 5} />
          )}

          {/* 📋 Planning */}
          {planning.length > 0 && (
            <PaginatedTripSection icon="📋" label="Planning" count={planning.length} color="text-blue-600"
              trips={planning} renderCards={renderTripCards} pageSize={layout === "grid" ? 6 : 5} />
          )}

          {/* ✅ Completed */}
          {completed.length > 0 && (
            <PaginatedTripSection icon="✅" label="Completed" count={completed.length} color="text-emerald-600"
              trips={completed} renderCards={renderTripCards} pageSize={layout === "grid" ? 6 : 5} />
          )}

          {/* Empty state */}
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
      </div>
    </div>
  );

  function renderTripCards(tripList: Trip[]) {
    return (
      <div className={layout === "grid" ? "grid grid-cols-3 gap-3" : "grid gap-3"}>
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
              compact={layout === "grid"}
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
  assignedNames,
  currentTripNames,
  onSave,
  onCancel,
  onDelete,
}: {
  initial: TripGroupDef | null;
  allCountryNames: string[];
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

  // Available for main: not assigned elsewhere (allow current trip's countries)
  const availableMain = sorted.filter(
    (n) => !assignedNames.has(n) || currentSet.has(n) || n === main
  );

  // Available for add-ons: not assigned elsewhere and not the current main
  const availableAddOns = sorted.filter(
    (n) => n !== main && (!assignedNames.has(n) || currentSet.has(n) || addOns.includes(n))
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

function DashStat({ value, label, icon }: { value: number; label: string; icon: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm">{icon}</span>
      <span className="text-lg font-black text-slate-700">{value}</span>
      <span className="text-[11px] text-slate-400 font-medium">{label}</span>
    </div>
  );
}

function TripSection({ icon, label, count, color, children }: {
  icon: string; label: string; count: number; color: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">{icon}</span>
        <span className={`text-xs font-bold uppercase tracking-wider ${color}`}>{label}</span>
        <span className="text-[10px] text-slate-400 font-semibold bg-slate-100 px-2 py-0.5 rounded-full">{count}</span>
      </div>
      {children}
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
  const progress = trip.allCountries.length > 0
    ? Math.round((trip.visitedCount / trip.allCountries.length) * 100)
    : 0;

  // Build search queries for images — country landmark or "country name travel"
  const imageQueries = trip.allCountries.slice(0, 3).map((c) =>
    c.landmark ? `${c.landmark} ${c.name}` : `${c.name} travel landmark`
  );

  return (
    <div
      onClick={() => onSelect(trip.main)}
      className={`rounded-xl border overflow-hidden transition-all group cursor-pointer ${
        trip.allVisited
          ? "bg-emerald-50/60 border-emerald-200"
          : "bg-white border-gray-200 hover:border-blue-200 hover:shadow-sm"
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
            <span className="text-[9px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded shrink-0 ml-1">
              {trip.region}
            </span>
          </div>
          {isCombo && (
            <p className="text-[10px] text-gray-500 mb-1.5 truncate">+ {trip.addOns.map((c) => c.name).join(", ")}</p>
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
          {isCombo && (
            <>
              <span className="text-gray-300 text-xs shrink-0">+</span>
              <span className="text-xs text-gray-500 truncate">
                {trip.addOns.map((c) => c.name).join(", ")}
              </span>
              <span className="shrink-0 text-[10px] font-semibold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">
                {trip.allCountries.length} countries
              </span>
            </>
          )}
          <span className="shrink-0 text-[9px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
            {trip.region}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="opacity-0 group-hover:opacity-100 text-[11px] text-gray-400 hover:text-blue-600 px-1.5 py-0.5 rounded hover:bg-blue-50 transition-all"
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

      {/* Country chips (list mode only) */}
      {!compact && (
        <div className="flex flex-wrap gap-1.5">
          {trip.allCountries.map((c, i) => {
            const isVisited = visitedNames.has(c.name);
            const isFav = favorites.has(c.name);
            const isMain = i === 0 && isCombo;
            return (
              <button
                key={c.name}
                onClick={(e) => { e.stopPropagation(); onSelect(c); }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                  isVisited
                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                    : isMain
                      ? "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
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

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled(queries.map((q) => getWikiImage(q))).then((results) => {
      if (cancelled) return;
      const urls = results
        .filter((r): r is PromiseFulfilledResult<string | null> => r.status === "fulfilled")
        .map((r) => r.value)
        .filter((v): v is string => !!v);
      setImages(urls);
    });
    return () => { cancelled = true; };
  }, [queries.join(",")]);

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
