import { useMemo, useState } from "react";
import type { Country } from "../types";
import { ALL_REGIONS, type Region, type TripGroupDef } from "../data/tripGroups";

type Props = {
  countries: Country[];
  visitedNames: Set<string>;
  favorites: Set<string>;
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

    if (regionFilter !== "all") result = result.filter((t) => t.region === regionFilter);

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t) =>
        t.allCountries.some((c) => c.name.toLowerCase().includes(q))
      );
    }

    return result;
  }, [trips, viewMode, visitedMode, regionFilter, search]);

  const comboTrips = trips.filter((t) => t.addOns.length > 0);
  const soloTrips = trips.filter((t) => t.addOns.length === 0);
  const totalCountries = trips.reduce((s, t) => s + t.allCountries.length, 0);
  const totalVisited = trips.reduce((s, t) => s + t.visitedCount, 0);
  const tripsCompleted = trips.filter((t) => t.allVisited).length;

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
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Summary bar */}
      <div className="flex items-center gap-5 px-5 py-2.5 border-b bg-gradient-to-r from-slate-50 to-white shrink-0">
        <div className="flex items-center gap-5 flex-1 flex-wrap">
          <Stat value={trips.length} label="trips to cover all" color="text-blue-600" />
          <Stat value={comboTrips.length} label="combo" color="text-indigo-600" />
          <Stat value={soloTrips.length} label="solo" color="text-slate-500" />
          <div className="h-5 w-px bg-gray-200" />
          <Stat value={totalCountries} label="countries" color="text-emerald-600" />
          <Stat value={totalVisited} label="visited" color="text-green-600" />
          <Stat value={tripsCompleted} label={`of ${trips.length} complete`} color="text-green-600" />
        </div>
        <button
          onClick={() => { setCreatingNew(true); setEditingMain(null); }}
          className="shrink-0 flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          + New Trip
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 px-5 py-2 border-b bg-white shrink-0 overflow-x-auto">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search countries…"
          className="w-44 px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-300 focus:outline-none transition-colors"
        />

        <div className="h-5 w-px bg-gray-200 shrink-0" />

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

        {(search || viewMode !== "all" || visitedMode !== "all" || regionFilter !== "all") && (
          <button
            onClick={() => { setSearch(""); setViewMode("all"); setVisitedMode("all"); setRegionFilter("all"); }}
            className="shrink-0 text-[10px] text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Trip cards */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="max-w-5xl mx-auto">
          {/* Create new trip form — above filtered list */}
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
            <p className="text-[10px] text-gray-400 mb-3">
              Showing {filtered.length} of {trips.length} trips
            </p>
          )}
          <div className="grid gap-3">
            {filtered.map((trip) =>
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
                  onEdit={trip.source === "group" ? () => { setEditingMain(trip.main.name); setCreatingNew(false); } : undefined}
                />
              ),
            )}

            {filtered.length === 0 && !creatingNew && (
              <div className="text-center py-16 text-gray-400 text-sm">
                No trips match your filters.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
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

function PillGroup({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 bg-gray-100 rounded-full p-0.5 shrink-0">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all whitespace-nowrap ${
            value === o.key
              ? "bg-white text-blue-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={`text-lg font-bold ${color}`}>{value}</span>
      <span className="text-[11px] text-gray-400 font-medium">{label}</span>
    </div>
  );
}

function TripRow({
  trip,
  visitedNames,
  favorites,
  onSelect,
  onEdit,
}: {
  trip: Trip;
  visitedNames: Set<string>;
  favorites: Set<string>;
  onSelect: (c: Country) => void;
  onEdit?: () => void;
}) {
  const isCombo = trip.addOns.length > 0;
  const progress = trip.allCountries.length > 0
    ? Math.round((trip.visitedCount / trip.allCountries.length) * 100)
    : 0;

  return (
    <div
      className={`rounded-xl border p-4 transition-all group ${
        trip.allVisited
          ? "bg-emerald-50/60 border-emerald-200"
          : "bg-white border-gray-200 hover:border-blue-200 hover:shadow-sm"
      }`}
    >
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
              onClick={onEdit}
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

      {/* Country chips */}
      <div className="flex flex-wrap gap-1.5">
        {trip.allCountries.map((c, i) => {
          const isVisited = visitedNames.has(c.name);
          const isFav = favorites.has(c.name);
          const isMain = i === 0 && isCombo;
          return (
            <button
              key={c.name}
              onClick={() => onSelect(c)}
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

      {/* Shared experiences */}
      {isCombo && (
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
