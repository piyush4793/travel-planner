import { useState, useCallback, useMemo, useRef } from "react";
import type maplibregl from "maplibre-gl";
import type { Country, VisitedFilter } from "./types";
import MapView from "./components/views/MapView";
import CalendarView from "./components/views/CalendarView";
import ListView from "./components/views/ListView";
import DiscoverView from "./components/views/DiscoverView";
import TripsView from "./components/views/TripsView";
import Filters from "./components/shared/Filters";
import HomeCountrySelector from "./components/shared/HomeCountrySelector";
import CountryPanel from "./components/country/CountryPanel";
import CountryForm from "./components/country/CountryForm";
import SettingsModal from "./components/ai/SettingsModal";
import ChatModal from "./components/ai/ChatModal";
import AiItineraryModal from "./components/ai/AiItineraryModal";
import type { LLMTripPlanResult } from "./utils/ai/llmTransform";
import { applyFilters, allUniqueExperiences, type BudgetTier } from "./utils/filterLogic";
import { loadLS, saveLS } from "./utils/storage";
import { useHashView, type AppView } from "./hooks/useHashView";
import { useCountryStore } from "./hooks/useCountryStore";
import { useTripStore } from "./hooks/useTripStore";
import { isEnabled } from "./utils/featureFlags";
import { useEffect } from "react";

const VIEW_LABELS: Record<AppView, string> = {
  map: "🗺 Map", calendar: "📅 Calendar", list: "☰ List",
  trips: "✈ Trips", discover: "🌍 Discover",
};

export default function App() {
  const store = useCountryStore();
  const [view, setView] = useHashView();
  const [homeCountry, setHomeCountry] = useState(() => loadLS("tp_home_country", "India"));
  const [selectedMonth, setSelectedMonth] = useState<string[]>([]);
  const [selectedExperiences, setSelectedExperiences] = useState<string[]>([]);
  const [visitedFilter, setVisitedFilter] = useState<VisitedFilter>("all");
  const [budgetFilter, setBudgetFilter] = useState<BudgetTier>("all");
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [formTarget, setFormTarget] = useState<Country | "new" | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [aiPlanResult, setAiPlanResult] = useState<LLMTripPlanResult | null>(null);
  const mainMapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => { saveLS("tp_home_country", homeCountry); }, [homeCountry]);

  const trips = useTripStore(store.myListNames);

  const filtered = useMemo(
    () => applyFilters(store.myListCountries, selectedMonth, selectedExperiences, store.visited.set, visitedFilter, budgetFilter),
    [store.myListCountries, selectedMonth, selectedExperiences, store.visited.set, visitedFilter, budgetFilter],
  );
  const allExperiences = useMemo(() => allUniqueExperiences(store.myListCountries), [store.myListCountries]);
  const comboNames = selectedCountry?.combo ?? [];

  const handleSave = useCallback((country: Country) => {
    store.saveCountry(country);
    setFormTarget(null);
    setSelectedCountry(country);
  }, [store]);

  const handleDelete = useCallback((country: Country) => {
    store.deleteCountry(country);
    setSelectedCountry(null);
  }, [store]);

  const handleUpdateNotes = useCallback((notes: string) => {
    setSelectedCountry((current) => {
      if (!current) return current;
      store.updateNotes(current.name, notes);
      return { ...current, notes: notes.trim() || undefined };
    });
  }, [store]);

  const toggleExperience = useCallback((tag: string) => {
    setSelectedExperiences((p) => p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag]);
  }, []);

  const handleAiPlanReady = useCallback((result: LLMTripPlanResult) => {
    setAiPlanResult(result);
  }, []);

  const hasActiveFilters = selectedMonth.length > 0 || selectedExperiences.length > 0 || visitedFilter !== "all" || budgetFilter !== "all";

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 text-white shrink-0 shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-lg font-black tracking-tight">Travel Planner</span>
          {hasActiveFilters && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">
              {filtered.length} shown
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5 bg-black/20 rounded-full p-0.5 mx-auto">
          {(Object.keys(VIEW_LABELS) as AppView[]).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                view === v ? "bg-white text-blue-700 shadow-sm" : "text-white/80 hover:text-white"
              }`}>
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <HomeCountrySelector value={homeCountry} onChange={setHomeCountry} />
          {store.favorites.set.size > 0 && <span className="text-yellow-300 text-sm font-semibold">★ {store.favorites.set.size}</span>}
          {store.visited.set.size > 0 && <span className="text-emerald-300 text-sm font-semibold">✓ {store.visited.set.size}</span>}
          <span className="text-white/60 text-xs font-medium">{store.myList.set.size} 📋</span>
          <button onClick={() => setFormTarget("new")}
            className="flex items-center gap-1 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-full text-xs font-semibold transition-colors border border-white/20">
            + Add
          </button>
          {isEnabled("llmPlanning") && (
            <>
              <button onClick={() => setChatOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-full text-xs font-semibold transition-colors border border-emerald-400/30 text-emerald-300">
                ✨ Plan with AI
              </button>
              <button onClick={() => setSettingsOpen(true)}
                className="flex items-center justify-center w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full text-sm transition-colors border border-white/15"
                title="AI Settings">
                ⚙️
              </button>
            </>
          )}
        </div>
      </header>

      {view !== "discover" && (
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
      )}

      <div className="flex-1 relative overflow-hidden">
        {view === "map" ? (
          <MapView
            countries={filtered}
            onSelect={setSelectedCountry}
            highlightedNames={comboNames}
            visitedNames={store.visited.set}
            onMapReady={(m) => { mainMapRef.current = m; }}
          />
        ) : view === "calendar" ? (
          <CalendarView
            countries={filtered}
            onSelect={setSelectedCountry}
            visitedNames={store.visited.set}
            selectedCountry={selectedCountry}
          />
        ) : view === "list" ? (
          <ListView
            countries={filtered}
            visitedNames={store.visited.set}
            favorites={store.favorites.set}
            onToggleVisited={store.visited.toggle}
            onToggleFavorite={store.favorites.toggle}
            onEdit={(c) => setFormTarget(c)}
            onDelete={handleDelete}
            onSelect={setSelectedCountry}
            selectedCountry={selectedCountry}
          />
        ) : view === "trips" ? (
          <TripsView
            countries={store.myListCountries}
            visitedNames={store.visited.set}
            favorites={store.favorites.set}
            onSelect={setSelectedCountry}
            tripGroups={trips.mergedTripGroups}
            onSaveTrip={trips.saveTrip}
            onDeleteTrip={trips.deleteTrip}
          />
        ) : (
          <DiscoverView
            catalog={store.catalog}
            myListNames={store.myList.set}
            onAddToList={store.addToList}
            onRemoveFromList={store.myList.remove}
          />
        )}

        <CountryPanel
          country={selectedCountry}
          onClose={() => setSelectedCountry(null)}
          isFavorite={selectedCountry ? store.favorites.set.has(selectedCountry.name) : false}
          onToggleFavorite={() => selectedCountry && store.favorites.toggle(selectedCountry.name)}
          isVisited={selectedCountry ? store.visited.set.has(selectedCountry.name) : false}
          onToggleVisited={() => selectedCountry && store.visited.toggle(selectedCountry.name)}
          onFilterExperience={toggleExperience}
          activeExperiences={selectedExperiences}
          onEdit={() => selectedCountry && setFormTarget(selectedCountry)}
          onDelete={() => selectedCountry && handleDelete(selectedCountry)}
          onUpdateNotes={handleUpdateNotes}
          homeCountry={homeCountry}
          mainMapRef={mainMapRef}
          allCountries={store.myListCountries}
        />
      </div>

      {formTarget !== null && (
        <CountryForm
          initial={formTarget === "new" ? undefined : formTarget}
          existingNames={store.myListNames}
          onSave={handleSave}
          onClose={() => setFormTarget(null)}
        />
      )}

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ChatModal
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        homeCountry={homeCountry}
        onPlanReady={handleAiPlanReady}
      />
      {aiPlanResult && (
        <AiItineraryModal
          result={aiPlanResult}
          onClose={() => setAiPlanResult(null)}
        />
      )}
    </div>
  );
}
