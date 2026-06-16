import { useState, useCallback, useMemo, useRef, useEffect, lazy, Suspense } from "react";
import type maplibregl from "maplibre-gl";
import type { Country, VisitedFilter } from "./core/types";
import MapView from "./components/views/MapView";
import CalendarView from "./components/views/CalendarView";
import DiscoverView from "./components/views/DiscoverView";
import TripsView from "./components/views/TripsView";
import HomeCountrySelector from "./components/shared/HomeCountrySelector";
import DevFlagPanel from "./components/shared/DevFlagPanel";
import CountryPanel from "./components/country/CountryPanel";
import type { LLMTripPlanResult } from "./core/utils/ai/llmTransform";
import { applyFilters, type BudgetTier, type BudgetBasis } from "./core/utils/filterLogic";
import { loadLS, saveLS } from "./core/storage";
import { LS_KEYS } from "./core/lsKeys";
import { useHashView, type AppView } from "./hooks/useHashView";
import { useCountryStore } from "./hooks/useCountryStore";
import { useTripStore } from "./hooks/useTripStore";
import { useAiPlanStore } from "./hooks/useAiPlanStore";
import { useBreakpoint } from "./hooks/useBreakpoint";
import { isEnabled } from "./core/featureFlags";
import { useInstallPrompt } from "./hooks/useInstallPrompt";
import { isBackupOverdue, autoBackupIfOverdue } from "./utils/backup";

// Lazy-load heavy modals/overlays — only fetched when first opened
const CountryForm = lazy(() => import("./components/country/CountryForm"));
const SettingsModal = lazy(() => import("./components/ai/SettingsModal"));
const ChatModal = lazy(() => import("./components/ai/ChatModal"));
const AiItineraryModal = lazy(() => import("./components/ai/AiItineraryModal"));
const FreTour = lazy(() => import("./components/shared/FreTour"));

const VIEW_LABELS: Record<AppView, string> = {
  trips: "✈ Trips", calendar: "📅 Calendar", discover: "🌍 Discover",
};

export default function App() {
  const store = useCountryStore();
  const aiPlanStore = useAiPlanStore();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const installPrompt = useInstallPrompt();
  const [view, setView] = useHashView();
  const [homeCountry, setHomeCountry] = useState(() => loadLS(LS_KEYS.HOME_COUNTRY, "India"));
  const [selectedMonth, setSelectedMonth] = useState<string[]>([]);
  const [selectedExperiences, setSelectedExperiences] = useState<string[]>([]);
  const [visitedFilter, setVisitedFilter] = useState<VisitedFilter>("all");
  const [budgetFilter, setBudgetFilter] = useState<BudgetTier>("all");
  const [budgetBasis, setBudgetBasis] = useState<BudgetBasis>("couple");
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [formTarget, setFormTarget] = useState<Country | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInitialPrompt, setChatInitialPrompt] = useState<string | undefined>();
  const [chatAutoSend, setChatAutoSend] = useState(true);
  const [aiPlanResult, setAiPlanResult] = useState<LLMTripPlanResult | null>(null);
  const [cinematicActive, setCinematicActive] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const mainMapRef = useRef<maplibregl.Map | null>(null);
  const [backupBannerDismissed, setBackupBannerDismissed] = useState(false);

  useEffect(() => { saveLS(LS_KEYS.HOME_COUNTRY, homeCountry); }, [homeCountry]);

  // Auto-backup on mount when overdue
  const autoBackupRan = useRef(false);
  useEffect(() => {
    if (autoBackupRan.current) return;
    autoBackupRan.current = true;
    if (autoBackupIfOverdue()) {
      setBackupBannerDismissed(true);
    }
  }, []);

  // Re-render when dev flag panel toggles a feature
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const handler = () => forceUpdate((n) => n + 1);
    window.addEventListener("featureflag-change", handler);
    return () => window.removeEventListener("featureflag-change", handler);
  }, []);

  const trips = useTripStore(store.myListNames, store.myListCountries);

  const filtered = useMemo(
    () => applyFilters(store.myListCountries, selectedMonth, selectedExperiences, store.visited.set, visitedFilter, budgetFilter, budgetBasis),
    [store.myListCountries, selectedMonth, selectedExperiences, store.visited.set, visitedFilter, budgetFilter, budgetBasis],
  );
  // For Trips: apply all filters EXCEPT visited (Trips filters at trip-card level)
  const filteredForTrips = useMemo(
    () => applyFilters(store.myListCountries, selectedMonth, [], store.visited.set, "all", budgetFilter, budgetBasis),
    [store.myListCountries, selectedMonth, store.visited.set, budgetFilter, budgetBasis],
  );
  const comboNames = selectedCountry?.combo ?? [];

  const handleSave = useCallback((country: Country) => {
    store.saveCountry(country);
    setFormTarget(null);
    setSelectedCountry(country);
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

  const handleDeleteAiPlan = useCallback((planId: string) => {
    if (!selectedCountry) return;
    aiPlanStore.deletePlan(selectedCountry.name, planId);
  }, [selectedCountry, aiPlanStore]);

  const selectedCountryAiPlans = useMemo(() => {
    if (!selectedCountry) return [];
    return aiPlanStore.getPlans(selectedCountry.name);
  }, [selectedCountry, aiPlanStore]);

  const handleSaveAiToList = useCallback((destinationName: string): "saved" | "exists" => {
    if (store.myList.set.has(destinationName)) return "exists";
    store.addToList(destinationName);
    return "saved";
  }, [store]);

  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-slate-50">
      {/* Header */}
      <header className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 text-white shrink-0 shadow-md">
        <div className="flex items-center gap-2 shrink-0">
          {/* Brand icon — all screens */}
          <img src="icon-192.svg" alt="Roamwise" className="w-7 h-7 md:w-8 md:h-8 shrink-0 rounded-lg" />
          <span className="hidden md:inline text-lg font-black tracking-tight">Roamwise</span>
        </div>

        {/* Desktop nav pills */}
        <div className="hidden md:flex items-center gap-0.5 bg-black/20 rounded-full p-0.5 mx-auto">
          {(Object.keys(VIEW_LABELS) as AppView[]).map((v) => (
            <button key={v} onClick={() => setView(v)}
              data-tour={`nav-${v}`}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                view === v ? "bg-white text-blue-700 shadow-sm" : "text-white/80 hover:text-white"
              }`}>
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>

        {/* Mobile nav pills — compact */}
        <div className="flex md:hidden items-center gap-0.5 bg-black/20 rounded-full p-0.5 mx-auto overflow-x-auto max-w-[56vw]">
          {(Object.keys(VIEW_LABELS) as AppView[]).map((v) => (
            <button key={v} onClick={() => setView(v)}
              data-tour={isMobile ? `nav-${v}` : undefined}
              className={`px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-all min-h-[36px] ${
                view === v ? "bg-white text-blue-700 shadow-sm" : "text-white/80 hover:text-white"
              }`}>
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2.5 shrink-0">
          <HomeCountrySelector value={homeCountry} onChange={setHomeCountry} />
          <button onClick={() => setSettingsOpen(true)}
            data-tour="settings"
            className="flex items-center justify-center w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full text-sm transition-colors border border-white/15"
            title="Settings">
            ⚙️
          </button>
          <DevFlagPanel />
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          data-tour="mobile-menu"
          className="md:hidden flex items-center justify-center w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full text-base transition-colors shrink-0"
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </header>

      {/* Mobile menu slide-down */}
      {menuOpen && isMobile && (
        <div className="md:hidden bg-gradient-to-b from-indigo-600 to-indigo-700 text-white px-4 py-3 space-y-3 shrink-0 shadow-lg">
          <div className="flex items-center gap-2 flex-wrap">
            <HomeCountrySelector value={homeCountry} onChange={(v) => { setHomeCountry(v); }} />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setSettingsOpen(true); setMenuOpen(false); }}
              className="flex items-center justify-center w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full text-sm transition-colors border border-white/15"
              title="Settings"
            >
              ⚙️
            </button>
            <span className="text-xs font-medium text-white/85">Settings</span>
            <DevFlagPanel />
          </div>
        </div>
      )}

      {/* Backup reminder banner */}
      {!backupBannerDismissed && isBackupOverdue() && (
        <div className="bg-amber-500/90 text-white px-4 py-2 flex items-center gap-3 text-xs shrink-0">
          <span>💾 You haven't backed up recently. Keep your travel data safe!</span>
          <button onClick={() => setSettingsOpen(true)} className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-colors">Backup Now</button>
          <button onClick={() => setBackupBannerDismissed(true)} className="ml-auto text-white/70 hover:text-white" aria-label="Dismiss">✕</button>
        </div>
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
            setVisitedFilter={setVisitedFilter}
            selectedMonth={selectedMonth}
            setMonth={setSelectedMonth}
            budgetFilter={budgetFilter}
            setBudgetFilter={setBudgetFilter}
            budgetBasis={budgetBasis}
            setBudgetBasis={setBudgetBasis}
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
          onSelectCountry={setSelectedCountry}
          isFavorite={selectedCountry ? store.favorites.set.has(selectedCountry.name) : false}
          onToggleFavorite={() => selectedCountry && store.favorites.toggle(selectedCountry.name)}
          isVisited={selectedCountry ? store.visited.set.has(selectedCountry.name) : false}
          onToggleVisited={() => selectedCountry && store.visited.toggle(selectedCountry.name)}
          onFilterExperience={toggleExperience}
          activeExperiences={selectedExperiences}
          onEdit={() => selectedCountry && setFormTarget(selectedCountry)}
          onUpdateNotes={handleUpdateNotes}
          homeCountry={homeCountry}
          mainMapRef={mainMapRef}
          allCountries={store.myListCountries}
          onPlanWithAi={isEnabled("llmPlanning") ? handlePlanWithAi : undefined}
          aiPlans={isEnabled("llmPlanning") ? selectedCountryAiPlans : undefined}
          onDeleteAiPlan={isEnabled("llmPlanning") ? handleDeleteAiPlan : undefined}
          onCinematicChange={setCinematicActive}
        />
      </div>

      <Suspense fallback={null}>
        {formTarget !== null && (
          <CountryForm
            initial={formTarget}
            onSave={handleSave}
            onClose={() => setFormTarget(null)}
          />
        )}

        {settingsOpen && (
          <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} onOpenChat={() => { setChatInitialPrompt(undefined); setChatOpen(true); }} countries={store.myListCountries} />
        )}
        {chatOpen && (
          <ChatModal
            open={chatOpen}
            onClose={() => { setChatOpen(false); setChatInitialPrompt(undefined); setChatAutoSend(true); }}
            homeCountry={homeCountry}
            onPlanReady={handleAiPlanReady}
            onOpenSettings={() => setSettingsOpen(true)}
            initialPrompt={chatInitialPrompt}
            autoSend={chatAutoSend}
            onSaveImportedPlan={(result) => { setAiPlanResult(result); setChatOpen(false); }}
          />
        )}
        {aiPlanResult && (
          <AiItineraryModal
            result={aiPlanResult}
            onClose={() => setAiPlanResult(null)}
            onSaveToList={
              store.myList.set.has(aiPlanResult.destinationName) ||
              store.myListNames.some((n) => n.toLowerCase() === aiPlanResult.destinationName.toLowerCase())
                ? undefined : handleSaveAiToList
            }
            existingPlans={aiPlanStore.getPlans(aiPlanResult.destinationName)}
            canAddNew={aiPlanStore.canAddNew(aiPlanResult.destinationName)}
            maxPlans={aiPlanStore.maxPlans}
            onSavePlan={() => aiPlanResult && aiPlanStore.savePlan(aiPlanResult)}
            onReplacePlan={(id) => aiPlanResult && aiPlanStore.replacePlan(id, aiPlanResult)}
          />
        )}

        <FreTour
          canPromptInstall={installPrompt.canPrompt}
          isInstalled={installPrompt.isInstalled}
          isIOS={installPrompt.isIOS}
          onInstall={installPrompt.promptInstall}
        />
      </Suspense>
    </div>
  );
}
