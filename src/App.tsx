import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type maplibregl from "maplibre-gl";
import type { Country, VisitedFilter } from "./types";
import MapView from "./components/views/MapView";
import CalendarView from "./components/views/CalendarView";
import DiscoverView from "./components/views/DiscoverView";
import TripsView from "./components/views/TripsView";
import Filters from "./components/shared/Filters";
import HomeCountrySelector from "./components/shared/HomeCountrySelector";
import DevFlagPanel from "./components/shared/DevFlagPanel";
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
import { useAiPlanStore } from "./hooks/useAiPlanStore";
import { formatPlanLabel } from "./utils/planDiff";
import { isEnabled } from "./utils/featureFlags";

const VIEW_LABELS: Record<AppView, string> = {
  trips: "✈ Trips", calendar: "📅 Calendar", discover: "🌍 Discover",
};

export default function App() {
  const store = useCountryStore();
  const aiPlanStore = useAiPlanStore();
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
  const [chatInitialPrompt, setChatInitialPrompt] = useState<string | undefined>();
  const [chatAutoSend, setChatAutoSend] = useState(true);
  const [aiPlanResult, setAiPlanResult] = useState<LLMTripPlanResult | null>(null);
  const [cinematicActive, setCinematicActive] = useState(false);
  const mainMapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => { saveLS("tp_home_country", homeCountry); }, [homeCountry]);

  // Re-render when dev flag panel toggles a feature
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const handler = () => forceUpdate((n) => n + 1);
    window.addEventListener("featureflag-change", handler);
    return () => window.removeEventListener("featureflag-change", handler);
  }, []);

  const trips = useTripStore(store.myListNames);

  const filtered = useMemo(
    () => applyFilters(store.myListCountries, selectedMonth, selectedExperiences, store.visited.set, visitedFilter, budgetFilter),
    [store.myListCountries, selectedMonth, selectedExperiences, store.visited.set, visitedFilter, budgetFilter],
  );
  // For Trips: apply all filters EXCEPT visited (Trips filters at trip-card level)
  const filteredForTrips = useMemo(
    () => applyFilters(store.myListCountries, selectedMonth, selectedExperiences, store.visited.set, "all", budgetFilter),
    [store.myListCountries, selectedMonth, selectedExperiences, store.visited.set, budgetFilter],
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

  const handlePlanWithAi = useCallback((countryName: string) => {
    const c = store.myListCountries.find((x) => x.name === countryName);
    const parts = [`Plan a trip to ${countryName}`];
    if (c) {
      if (c.budget) parts.push(`Budget: ${c.budget}`);
      if (c.bestMonths?.length) parts.push(`Best months: ${c.bestMonths.join(", ")}`);
      if (c.cities?.length) parts.push(`Cities to consider: ${c.cities.map((x) => x.name).join(", ")}`);
      if (c.experiences?.length) parts.push(`Experiences: ${c.experiences.slice(0, 5).join(", ")}`);
      if (c.combo?.length) parts.push(`Can combine with: ${c.combo.join(", ")}`);
    }
    setChatInitialPrompt(parts.join(". "));
    setChatAutoSend(false);
    setChatOpen(true);
  }, [store.myListCountries]);

  const handleViewAiPlan = useCallback((planId: string) => {
    if (!selectedCountry) return;
    const plans = aiPlanStore.getPlans(selectedCountry.name);
    const plan = plans.find((p) => p.id === planId);
    if (plan) setAiPlanResult(plan.result);
  }, [selectedCountry, aiPlanStore]);

  const handleDeleteAiPlan = useCallback((planId: string) => {
    if (!selectedCountry) return;
    aiPlanStore.deletePlan(selectedCountry.name, planId);
  }, [selectedCountry, aiPlanStore]);

  const selectedCountryPlans = useMemo(() => {
    if (!selectedCountry) return [];
    return aiPlanStore.getPlans(selectedCountry.name).map((sp) => ({
      id: sp.id,
      savedAt: sp.savedAt,
      label: formatPlanLabel(sp.result, sp.savedAt),
    }));
  }, [selectedCountry, aiPlanStore]);

  const handleSaveAiToList = useCallback((destinationName: string): "saved" | "exists" => {
    if (store.myList.set.has(destinationName)) return "exists";
    store.addToList(destinationName);
    return "saved";
  }, [store]);

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
              <button onClick={() => { setChatInitialPrompt(undefined); setChatOpen(true); }}
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
          <DevFlagPanel />
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
        {/* MapView — hidden by default, shown during Cinematic mode */}
        <div className={`absolute inset-0 transition-opacity duration-300 ${
          cinematicActive ? "z-10 opacity-100" : "-z-10 opacity-0 pointer-events-none"
        }`}>
          <MapView
            countries={filtered}
            onSelect={setSelectedCountry}
            highlightedNames={comboNames}
            visitedNames={store.visited.set}
            onMapReady={(m) => { mainMapRef.current = m; }}
          />
        </div>

        {view === "trips" ? (
          <TripsView
            countries={filteredForTrips}
            visitedNames={store.visited.set}
            favorites={store.favorites.set}
            visitedFilter={visitedFilter}
            onSelect={setSelectedCountry}
            tripGroups={trips.mergedTripGroups}
            onSaveTrip={trips.saveTrip}
            onDeleteTrip={trips.deleteTrip}
          />
        ) : view === "calendar" ? (
          <CalendarView
            countries={filtered}
            onSelect={setSelectedCountry}
            visitedNames={store.visited.set}
            selectedCountry={selectedCountry}
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
          onPlanWithAi={isEnabled("llmPlanning") ? handlePlanWithAi : undefined}
          savedAiPlans={isEnabled("llmPlanning") ? selectedCountryPlans : undefined}
          onViewAiPlan={isEnabled("llmPlanning") ? handleViewAiPlan : undefined}
          onDeleteAiPlan={isEnabled("llmPlanning") ? handleDeleteAiPlan : undefined}
          onCinematicChange={setCinematicActive}
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

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} onOpenChat={() => { setChatInitialPrompt(undefined); setChatOpen(true); }} />
      <ChatModal
        open={chatOpen}
        onClose={() => { setChatOpen(false); setChatInitialPrompt(undefined); setChatAutoSend(true); }}
        homeCountry={homeCountry}
        onPlanReady={handleAiPlanReady}
        onOpenSettings={() => setSettingsOpen(true)}
        initialPrompt={chatInitialPrompt}
        autoSend={chatAutoSend}
      />
      {aiPlanResult && (
        <AiItineraryModal
          result={aiPlanResult}
          onClose={() => setAiPlanResult(null)}
          onSaveToList={handleSaveAiToList}
          existingPlans={aiPlanStore.getPlans(aiPlanResult.destinationName)}
          canAddNew={aiPlanStore.canAddNew(aiPlanResult.destinationName)}
          maxPlans={aiPlanStore.maxPlans}
          onSavePlan={() => aiPlanResult && aiPlanStore.savePlan(aiPlanResult)}
          onReplacePlan={(id) => aiPlanResult && aiPlanStore.replacePlan(id, aiPlanResult)}
        />
      )}
    </div>
  );
}
