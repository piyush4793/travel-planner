import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type maplibregl from "maplibre-gl";
import seedData from "../data/countries.json";
import type { Country, VisitedFilter } from "./types";
import MapView from "./components/MapView";
import CalendarView from "./components/CalendarView";
import ListView from "./components/ListView";
import Filters from "./components/Filters";
import CountryPanel from "./components/CountryPanel";
import CountryForm from "./components/CountryForm";
import TripsView from "./components/TripsView";
import { applyFilters, allUniqueExperiences, type BudgetTier } from "./utils/filterLogic";
import { loadLS, saveLS } from "./utils/storage";

const SEED = seedData as Country[];

type AppView = "map" | "calendar" | "list" | "trips";

function getViewFromHash(): AppView {
  const h = window.location.hash.slice(1);
  if (h === "calendar" || h === "list" || h === "trips") return h;
  return "map";
}

const HOME_COUNTRIES = [
  "India", "United States", "United Kingdom", "Germany", "France",
  "Australia", "Canada", "Singapore", "UAE", "Japan", "South Korea",
  "Netherlands", "Italy", "Spain", "Brazil", "South Africa",
];

function HomeCountrySelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 px-2.5 py-1.5 bg-white/15 hover:bg-white/25 rounded-full text-xs font-semibold transition-colors border border-white/20 text-white"
      >
        📍 {value}
        <span className={`text-white/60 text-[10px] transition-transform inline-block ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-200 z-50 py-1 min-w-44 max-h-60 overflow-y-auto">
          {HOME_COUNTRIES.map((c) => (
            <button
              key={c}
              onClick={() => { onChange(c); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                c === value ? "text-blue-600 font-bold bg-blue-50" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {c === value ? "✓ " : "  "}{c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function buildCountryList(customs: Country[], deleted: string[]): Country[] {
  const overrides = new Map(customs.map((c) => [c.name, c]));
  const base = SEED
    .filter((c) => !deleted.includes(c.name))
    .map((c) => overrides.get(c.name) ?? c);
  const added = customs.filter((c) => !SEED.find((s) => s.name === c.name));
  return [...base, ...added];
}

export default function App() {
  const [customs, setCustoms] = useState<Country[]>(() => loadLS("tp_customs", []));
  const [deleted, setDeleted] = useState<string[]>(() => loadLS("tp_deleted", []));
  const [visited, setVisited] = useState<Set<string>>(() => new Set(loadLS<string[]>("tp_visited", [])));
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set(loadLS<string[]>("tp_favorites", [])));

  const [view, setView] = useState<AppView>(getViewFromHash);
  const [homeCountry, setHomeCountry] = useState<string>(() => loadLS("tp_home_country", "India"));
  const [selectedMonth, setSelectedMonth] = useState<string[]>([]);
  const [selectedExperiences, setSelectedExperiences] = useState<string[]>([]);
  const [visitedFilter, setVisitedFilter] = useState<VisitedFilter>("all");
  const [budgetFilter, setBudgetFilter] = useState<BudgetTier>("all");
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [formTarget, setFormTarget] = useState<Country | "new" | null>(null);
  const mainMapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => { saveLS("tp_customs", customs); }, [customs]);
  useEffect(() => { saveLS("tp_deleted", deleted); }, [deleted]);
  useEffect(() => { saveLS("tp_visited", [...visited]); }, [visited]);
  useEffect(() => { saveLS("tp_favorites", [...favorites]); }, [favorites]);
  useEffect(() => { saveLS("tp_home_country", homeCountry); }, [homeCountry]);

  // URL hash routing — sync view → hash
  useEffect(() => {
    const hash = `#${view}`;
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);
  }, [view]);

  // URL hash routing — browser back/forward → sync hash → view
  useEffect(() => {
    const handle = () => setView(getViewFromHash());
    window.addEventListener("popstate", handle);
    return () => window.removeEventListener("popstate", handle);
  }, []);

  const allCountries = useMemo(() => buildCountryList(customs, deleted), [customs, deleted]);
  const filtered = useMemo(
    () => applyFilters(allCountries, selectedMonth, selectedExperiences, visited, visitedFilter, budgetFilter),
    [allCountries, selectedMonth, selectedExperiences, visited, visitedFilter, budgetFilter]
  );
  const allExperiences = useMemo(() => allUniqueExperiences(allCountries), [allCountries]);
  const allNames = useMemo(() => allCountries.map((c) => c.name), [allCountries]);
  const comboNames = selectedCountry?.combo ?? [];

  const handleSave = useCallback((country: Country) => {
    setCustoms((prev) => [...prev.filter((c) => c.name !== country.name), country]);
    setFormTarget(null);
    setSelectedCountry(country);
  }, []);

  const handleDelete = useCallback((country: Country) => {
    setCustoms((prev) => prev.filter((c) => c.name !== country.name));
    if (SEED.find((s) => s.name === country.name)) {
      setDeleted((prev) => [...prev, country.name]);
    }
    setSelectedCountry(null);
  }, []);

  const handleToggleVisitedByName = useCallback((name: string) => {
    setVisited((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }, []);

  const handleToggleFavoriteByName = useCallback((name: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }, []);

  const handleUpdateNotes = useCallback((notes: string) => {
    setSelectedCountry((current) => {
      if (!current) return current;
      const updated = { ...current, notes: notes.trim() || undefined };
      setCustoms((prev) => [...prev.filter((c) => c.name !== updated.name), updated]);
      return updated;
    });
  }, []);

  const hasActiveFilters = selectedMonth.length > 0 || selectedExperiences.length > 0 || visitedFilter !== "all" || budgetFilter !== "all";

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 text-white shrink-0 shadow-md">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="text-lg font-black tracking-tight">Travel Planner</span>
          {hasActiveFilters && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">
              {filtered.length} shown
            </span>
          )}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-0.5 bg-black/20 rounded-full p-0.5 mx-auto">
          {(["map", "calendar", "list", "trips"] as AppView[]).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                view === v ? "bg-white text-blue-700 shadow-sm" : "text-white/80 hover:text-white"
              }`}>
              {v === "map" ? "🗺 Map" : v === "calendar" ? "📅 Calendar" : v === "list" ? "☰ List" : "✈ Trips"}
            </button>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2.5">
          <HomeCountrySelector value={homeCountry} onChange={setHomeCountry} />
          {favorites.size > 0 && <span className="text-yellow-300 text-sm font-semibold">★ {favorites.size}</span>}
          {visited.size > 0 && <span className="text-emerald-300 text-sm font-semibold">✓ {visited.size}</span>}
          <button onClick={() => setFormTarget("new")}
            className="flex items-center gap-1 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-full text-xs font-semibold transition-colors border border-white/20">
            + Add
          </button>
        </div>
      </header>

      <Filters
        selectedMonth={selectedMonth}
        setMonth={setSelectedMonth}
        activeExperiences={selectedExperiences}
        allExperiences={allExperiences}
        setExperiences={setSelectedExperiences}
        visitedFilter={visitedFilter}
        setVisitedFilter={setVisitedFilter}
        budgetFilter={budgetFilter}
        setBudgetFilter={setBudgetFilter}
      />

      <div className="flex-1 relative overflow-hidden">
        {view === "map" ? (
          <MapView
            countries={filtered}
            onSelect={setSelectedCountry}
            highlightedNames={comboNames}
            visitedNames={visited}
            onMapReady={(m) => { mainMapRef.current = m; }}
          />
        ) : view === "calendar" ? (
          <CalendarView
            countries={filtered}
            onSelect={setSelectedCountry}
            visitedNames={visited}
            selectedCountry={selectedCountry}
          />
        ) : view === "list" ? (
          <ListView
            countries={filtered}
            visitedNames={visited}
            favorites={favorites}
            onToggleVisited={handleToggleVisitedByName}
            onToggleFavorite={handleToggleFavoriteByName}
            onEdit={(c) => setFormTarget(c)}
            onDelete={handleDelete}
            onSelect={setSelectedCountry}
            selectedCountry={selectedCountry}
          />
        ) : (
          <TripsView
            countries={allCountries}
            visitedNames={visited}
            favorites={favorites}
            onSelect={setSelectedCountry}
          />
        )}

        <CountryPanel
          country={selectedCountry}
          onClose={() => setSelectedCountry(null)}
          isFavorite={selectedCountry ? favorites.has(selectedCountry.name) : false}
          onToggleFavorite={() => selectedCountry && handleToggleFavoriteByName(selectedCountry.name)}
          isVisited={selectedCountry ? visited.has(selectedCountry.name) : false}
          onToggleVisited={() => selectedCountry && handleToggleVisitedByName(selectedCountry.name)}
          onFilterExperience={(tag) =>
            setSelectedExperiences((p) => p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag])
          }
          activeExperiences={selectedExperiences}
          onEdit={() => selectedCountry && setFormTarget(selectedCountry)}
          onDelete={() => selectedCountry && handleDelete(selectedCountry)}
          onUpdateNotes={handleUpdateNotes}
          homeCountry={homeCountry}
          mainMapRef={mainMapRef}
          allCountries={allCountries}
        />
      </div>

      {formTarget !== null && (
        <CountryForm
          initial={formTarget === "new" ? undefined : formTarget}
          existingNames={allNames}
          onSave={handleSave}
          onClose={() => setFormTarget(null)}
        />
      )}
    </div>
  );
}
