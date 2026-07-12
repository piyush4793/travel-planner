import { useState, useCallback, useMemo, useRef, useEffect, Suspense } from "react";
import type maplibregl from "maplibre-gl";
import type { Country } from "./core/types";
import DevFlagPanel from "./components/shared/DevFlagPanel";
import { lazyWithRetry as lazy } from "./utils/lazyWithRetry";

// Lazy-load view and panel components — only fetched when first navigated/opened
const MapView = lazy(() => import("./components/views/MapView"));
const CalendarView = lazy(() => import("./components/views/CalendarView"));
const DiscoverView = lazy(() => import("./components/views/DiscoverView"));
const MyTripsView = lazy(() => import("./components/views/MyTripsView"));
const PlanView = lazy(() => import("./components/views/plan/PlanView"));
import type { LLMTripPlanResult } from "./core/utils/ai/llmTransform";
import { useBudgetBasis } from "./hooks/useBudgetBasis";
import { usePullToRefresh } from "./hooks/usePullToRefresh";
import { loadLS, saveLS } from "./core/storage";
import { LS_KEYS } from "./core/lsKeys";
import { useHashView, type AppView } from "./hooks/useHashView";
import { useCountryStore } from "./hooks/useCountryStore";
import { useSavedTrips } from "./hooks/useSavedTrips";
import { findSavedTripForCountries, toOpenRequest, type OpenTripRequest, type SavedTrip } from "./core/utils/savedTrips";
import { useAiPlanStore } from "./hooks/useAiPlanStore";
import { useBreakpoint } from "./hooks/useBreakpoint";
import { useLifecyclePrompts } from "./hooks/useLifecyclePrompts";
import LifecyclePromptToast from "./components/shared/LifecyclePromptToast";
import { isEnabled } from "./core/featureFlags";
import { useInstallPrompt } from "./hooks/useInstallPrompt";
import AppInstallShare from "./components/shared/AppInstallShare";
import { isBackupOverdue, autoBackupToTargetIfOverdue, hasAnyLocalData, canAutoImport, restoreFromTarget, backupToTarget } from "./utils/backup";

// Lazy-load heavy modals/overlays — only fetched when first opened
const SettingsModal = lazy(() => import("./components/ai/SettingsModal"));
const ChatModal = lazy(() => import("./components/ai/ChatModal"));
const AiItineraryModal = lazy(() => import("./components/ai/AiItineraryModal"));
const FreTour = lazy(() => import("./components/shared/FreTour"));

const VIEW_META: Record<AppView, { icon: string; label: string }> = {
  plan: { icon: "🧭", label: "Plan" },
  trips: { icon: "🧳", label: "Trips" },
  calendar: { icon: "📅", label: "Calendar" },
  discover: { icon: "🌍", label: "Discover" },
};

const NAV_VIEWS = Object.keys(VIEW_META) as AppView[];

export default function App() {
  const store = useCountryStore();
  const aiPlanStore = useAiPlanStore();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const installPrompt = useInstallPrompt();
  const [view, setView] = useHashView("plan");
  const [homeCountry, setHomeCountry] = useState(() => loadLS(LS_KEYS.HOME_COUNTRY, "India"));
  const { globalBasis, activeBasis, setGlobalBasis, setActiveBasis, reload: reloadBudgetBasis } = useBudgetBasis();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInitialPrompt, setChatInitialPrompt] = useState<string | undefined>();
  const [chatAutoSend, setChatAutoSend] = useState(true);
  const [aiPlanResult, setAiPlanResult] = useState<LLMTripPlanResult | null>(null);
  const [cinematicActive, setCinematicActive] = useState(false);
  const mainMapRef = useRef<maplibregl.Map | null>(null);
  const [backupBannerDismissed, setBackupBannerDismissed] = useState(false);
  const [restoreAvailable, setRestoreAvailable] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState(() => loadLS<string>(LS_KEYS.LAST_BACKUP, ""));

  useEffect(() => { saveLS(LS_KEYS.HOME_COUNTRY, homeCountry); }, [homeCountry]);

  // On mount: back up overdue data to the platform target, or — on a fresh
  // device with no local data — offer to restore from an existing backup.
  const autoBackupRan = useRef(false);
  useEffect(() => {
    if (autoBackupRan.current) return;
    autoBackupRan.current = true;
    let cancelled = false;
    (async () => {
      if (hasAnyLocalData()) {
        if (await autoBackupToTargetIfOverdue()) {
          if (!cancelled) {
            setBackupBannerDismissed(true);
            setLastBackupAt(loadLS<string>(LS_KEYS.LAST_BACKUP, ""));
          }
        }
        return;
      }
      if (await canAutoImport()) {
        if (!cancelled) setRestoreAvailable(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleRestoreFromTarget = async () => {
    setRestoreBusy(true);
    const result = await restoreFromTarget();
    setRestoreBusy(false);
    if (result.ok) window.location.reload();
    else setRestoreAvailable(false);
  };

  // Re-render when dev flag panel toggles a feature
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const handler = () => forceUpdate((n) => n + 1);
    window.addEventListener("featureflag-change", handler);
    return () => window.removeEventListener("featureflag-change", handler);
  }, []);

  // Detect localStorage changes from other tabs (resilience)
  const [storageConflict, setStorageConflict] = useState(false);
  useEffect(() => {
    const LS_KEY_SET = new Set<string>(Object.values(LS_KEYS));
    const handler = (e: StorageEvent) => {
      if (e.key && LS_KEY_SET.has(e.key)) {
        setStorageConflict(true);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const savedTrips = useSavedTrips();

  // Opening a saved trip reseeds the Plan wizard with its full snapshot (ordered
  // stops + per-stop cities/length + basis). The nonce makes re-opening the same
  // route re-apply (the wizard applies each nonce once, and restores the basis).
  const [planSeed, setPlanSeed] = useState<OpenTripRequest | null>(null);
  const openSavedTrip = useCallback((trip: SavedTrip) => {
    setPlanSeed(toOpenRequest(trip, Date.now()));
    setView("plan");
  }, []);
  // "+ New trip" / "Plan a trip" from My Trips: always land on a fresh Plan
  // landing picker rather than resuming the persisted draft. The nonce signals
  // PlanView to clear its in-progress selection/draft (the saved trip snapshot
  // in My Trips is untouched — only the wizard's working state resets).
  const [newPlanNonce, setNewPlanNonce] = useState(0);
  const startNewPlan = useCallback(() => {
    setPlanSeed(null);
    setNewPlanNonce((n) => n + 1);
    setView("plan");
  }, [setView]);
  // Resolve a saved trip for a picked country set (Plan landing resume prompt).
  const matchSavedTrip = useCallback(
    (names: string[]) => findSavedTripForCountries(savedTrips.savedTrips, names),
    [savedTrips.savedTrips],
  );

  // Soft refresh (pull-to-refresh): re-hydrate every persisted store from
  // localStorage without a full page reload — picks up edits made in another
  // tab or by an external import/restore.
  const softRefresh = useCallback(() => {
    store.reload();
    savedTrips.reload();
    aiPlanStore.reload();
    reloadBudgetBasis();
    setHomeCountry(loadLS(LS_KEYS.HOME_COUNTRY, "India"));
    setLastBackupAt(loadLS<string>(LS_KEYS.LAST_BACKUP, ""));
  }, [store.reload, savedTrips.reload, aiPlanStore.reload, reloadBudgetBasis]);

  // Disable the pull gesture while an overlay owns the screen, so its own
  // scrolling/gestures aren't hijacked.
  const overlayOpen =
    settingsOpen ||
    chatOpen || aiPlanResult !== null || cinematicActive;
  const { containerRef: pullRef, pullDistance, refreshing, threshold: pullThreshold } = usePullToRefresh({
    onRefresh: softRefresh,
    enabled: isMobile && !overlayOpen,
  });

  // The hidden cinematic MapView shows every My List destination; the former
  // app-level Trips filters were retired along with the old Trips dashboard.
  const filtered = store.myListCountries;

  // Resolve any country by name (My List → all seed/custom → catalog stub) so the
  // Discover/Calendar "start a plan" intake can seed the Plan wizard's selection.
  const resolveCountry = useCallback((name: string): Country | null => {
    const tracked = store.myListCountries.find((c) => c.name === name)
      ?? store.allCountries.find((c) => c.name === name);
    if (tracked) return tracked;
    const cat = store.catalog.find((c) => c.name === name);
    if (cat) {
      return { name: cat.name, lat: cat.lat, lng: cat.lng, region: cat.region, bestMonths: [], budget: "", experiences: [] };
    }
    return null;
  }, [store.myListCountries, store.allCountries, store.catalog]);

  // Start-a-plan intake from Discover (multi-select tray) or Calendar (tap a
  // destination): resolve the picked names into the wizard's ordered selection
  // and route to #plan. The nonce makes re-triggering the same set re-seed.
  const [planIntake, setPlanIntake] = useState<{ countries: Country[]; nonce: number } | null>(null);
  const handlePlanIntake = useCallback((names: string[]) => {
    const resolved = names
      .map((n) => resolveCountry(n))
      .filter((c): c is Country => c !== null);
    if (resolved.length === 0) return;
    setPlanIntake({ countries: resolved, nonce: Date.now() });
    setView("plan");
  }, [resolveCountry, setView]);

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

  const aiPlanCountFor = useCallback(
    (name: string) => aiPlanStore.getPlans(name).length,
    [aiPlanStore],
  );

  const handleSaveAiToList = useCallback((destinationName: string): "saved" | "exists" => {
    if (store.recentsSet.has(destinationName)) return "exists";
    store.recordPlanned([destinationName]);
    return "saved";
  }, [store]);

  // ── Lifecycle nudges (soft, non-blocking) ──────────────────────────────────
  // A coarse gauge of how much travel data the user has accrued; its growth
  // since the last backup drives the backup nudge.
  const dataFingerprint = useMemo(
    () =>
      store.myListCountries.length +
      aiPlanStore.getAllDestinations().length,
    [store.myListCountries.length, aiPlanStore],
  );
  const handleLifecycleBackup = useCallback(async () => {
    await backupToTarget();
    setLastBackupAt(loadLS<string>(LS_KEYS.LAST_BACKUP, ""));
  }, []);
  const lifecycle = useLifecyclePrompts({
    dataFingerprint,
    lastBackupAt,
    onBackup: handleLifecycleBackup,
  });
  const lifecycleOverlayOpen =
    settingsOpen || chatOpen || aiPlanResult !== null;

  return (
    <div className="flex flex-col h-viewport overflow-hidden bg-slate-50">
      {/* Header — luxury ivory/emerald top bar */}
      <header className="flex items-center gap-2 md:gap-3 px-3 md:px-5 pt-safe pb-2 md:pb-2.5 md:pt-2.5 bg-[#fbf9f3]/90 backdrop-blur-md border-b border-[#e7e1d2] text-[#2c2a24] shrink-0">
        <button onClick={() => setView("plan")} className="flex items-center gap-2 shrink-0 rounded-lg hover:opacity-80 transition-opacity focus-ring" aria-label="Home">
          {/* Brand icon — all screens */}
          <img src="icon-192.svg" alt="Roamwise" className="w-7 h-7 md:w-8 md:h-8 shrink-0 rounded-lg" />
          <span className="hidden md:inline text-lg font-black tracking-tight text-emerald-900">Roamwise</span>
        </button>

        {/* Desktop nav pills */}
        <div className="hidden md:flex items-center gap-0.5 bg-[#efe9db] rounded-full p-0.5 mx-auto" role="navigation" aria-label="Main navigation">
          {NAV_VIEWS.map((v) => (
            <button key={v} onClick={() => setView(v)}
              data-tour={`nav-${v}`}
              aria-current={view === v ? "page" : undefined}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors focus-ring ${
                view === v ? "bg-emerald-700 text-white shadow-sm" : "text-[#6f6a5d] hover:text-emerald-800"
              }`}>
              <span aria-hidden="true">{VIEW_META[v].icon}</span> {VIEW_META[v].label}
            </button>
          ))}
        </div>

        {/* Mobile spacer — navigation lives in the bottom tab bar; pushes actions right */}
        <div className="md:hidden flex-1" aria-hidden="true" />

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <AppInstallShare
            canInstall={installPrompt.canPrompt}
            isIOS={installPrompt.isIOS}
            isStandalone={installPrompt.isInstalled}
            installedInBrowser={installPrompt.installedInBrowser}
            onInstall={installPrompt.promptInstall}
            onOpenApp={installPrompt.openApp}
            variant="header"
          />
          <button onClick={() => setSettingsOpen(true)}
            data-tour="settings"
            className="flex items-center justify-center w-8 h-8 bg-[#efe9db] hover:bg-[#e5dfce] rounded-full text-sm transition-colors border border-[#e0dac9] focus-ring"
            aria-label="Settings">
            ⚙️
          </button>
          <DevFlagPanel />
        </div>

        {/* Mobile actions — compact Install/Share + Settings (no hamburger menu) */}
        <div className="flex md:hidden items-center gap-1.5 shrink-0">
          <AppInstallShare
            canInstall={installPrompt.canPrompt}
            isIOS={installPrompt.isIOS}
            isStandalone={installPrompt.isInstalled}
            installedInBrowser={installPrompt.installedInBrowser}
            onInstall={installPrompt.promptInstall}
            onOpenApp={installPrompt.openApp}
            variant="header"
          />
          <button onClick={() => setSettingsOpen(true)}
            data-tour="settings"
            className="flex items-center justify-center w-9 h-9 bg-[#efe9db] hover:bg-[#e5dfce] rounded-full text-base transition-colors border border-[#e0dac9] focus-ring"
            aria-label="Settings">
            ⚙️
          </button>
          <DevFlagPanel size="md" />
        </div>
      </header>

      {/* Fresh-device restore offer — data found in the backup location */}
      {restoreAvailable && (
        <div className="bg-emerald-600/90 text-white px-4 py-2 flex items-center gap-3 text-xs shrink-0">
          <span>📦 We found a saved backup for this app. Restore your travel data?</span>
          <button
            onClick={handleRestoreFromTarget}
            disabled={restoreBusy}
            className="focus-ring min-h-[32px] px-3 py-1 bg-white/20 hover:bg-white/30 disabled:opacity-60 rounded-lg font-semibold transition-colors"
          >
            {restoreBusy ? "Restoring…" : "Restore"}
          </button>
          <button
            onClick={() => setRestoreAvailable(false)}
            className="focus-ring min-h-[32px] min-w-[32px] ml-auto text-white/70 hover:text-white"
            aria-label="Dismiss restore offer"
          >✕</button>
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

      {storageConflict && (
        <div className="bg-red-500/90 text-white px-4 py-2 flex items-center gap-3 text-xs shrink-0">
          <span>⚠️ Data was changed in another tab. Reload to stay in sync.</span>
          <button onClick={() => window.location.reload()} className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-colors">Reload</button>
          <button onClick={() => setStorageConflict(false)} className="ml-auto text-white/70 hover:text-white" aria-label="Dismiss">✕</button>
        </div>
      )}


      <div className="flex-1 relative overflow-hidden" ref={pullRef}>
        {/* Pull-to-refresh indicator (mobile) — soft re-hydrate, no page reload */}
        {(pullDistance > 0 || refreshing) && (
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center"
            style={{
              transform: `translateY(${refreshing ? 10 : Math.max(0, pullDistance - 20)}px)`,
              opacity: refreshing ? 1 : Math.min(1, pullDistance / pullThreshold),
            }}
            aria-live="polite"
          >
            <div className="mt-1 flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 shadow-md ring-1 ring-black/5">
              <span
                className={`inline-block h-4 w-4 rounded-full border-2 border-emerald-600 border-t-transparent ${refreshing ? "motion-safe:animate-spin" : ""}`}
                style={refreshing ? undefined : { transform: `rotate(${pullDistance * 3}deg)` }}
                aria-hidden="true"
              />
              <span className="text-[11px] font-semibold text-emerald-800">
                {refreshing ? "Refreshing…" : pullDistance >= pullThreshold ? "Release to refresh" : "Pull to refresh"}
              </span>
            </div>
          </div>
        )}
        {/* MapView — hidden by default, shown during Cinematic mode */}
        <div className={`absolute inset-0 transition-opacity duration-300 ${
          cinematicActive ? "z-10 opacity-100" : "-z-10 opacity-0 pointer-events-none"
        }`}>
          <Suspense fallback={<div className="flex items-center justify-center h-full"><span className="text-sm text-gray-400">Loading map…</span></div>}>
          <MapView
            countries={filtered}
            onMapReady={(m) => { mainMapRef.current = m; }}
          />
          </Suspense>
        </div>

        <Suspense fallback={<div className="flex items-center justify-center h-full"><span className="text-sm text-gray-400">Loading…</span></div>}>
        {view === "plan" ? (
          <PlanView
            countries={store.myListCountries}
            budgetBasis={activeBasis}
            setBudgetBasis={setActiveBasis}
            homeCountry={homeCountry}
            onGoDiscover={() => setView("discover")}
            onSaveTrip={savedTrips.upsert}
            isTripFavorite={(name) => savedTrips.savedTrips.some((t) => t.name === name && !!t.favorite)}
            onToggleTripFavorite={savedTrips.toggleFavoriteByName}
            onPlanWithAi={isEnabled("llmPlanning") ? handlePlanWithAi : undefined}
            onRecordPlanned={store.recordPlanned}
            onUpdateNotes={store.updateNotes}
            aiPlanCountFor={isEnabled("llmPlanning") ? aiPlanCountFor : undefined}
            openTrip={planSeed}
            intake={planIntake}
            startNewNonce={newPlanNonce}
            matchSavedTrip={matchSavedTrip}
            mainMapRef={mainMapRef}
            onCinematicChange={setCinematicActive}
          />
        ) : view === "trips" ? (
          <MyTripsView
            savedTrips={savedTrips.savedTrips}
            onToggleFavorite={savedTrips.toggleFavorite}
            onRemove={savedTrips.remove}
            onOpen={openSavedTrip}
            onGoPlan={startNewPlan}
          />
        ) : view === "calendar" ? (
          <CalendarView
            countries={store.myListCountries}
            onPlanTrip={handlePlanIntake}
            budgetBasis={activeBasis}
          />
        ) : (
          <DiscoverView
            catalog={store.catalog}
            onPlanTrip={handlePlanIntake}
          />
        )}
        </Suspense>
      </div>

      {/* Mobile bottom tab bar — primary navigation on small screens */}
      <nav
        className="md:hidden shrink-0 flex items-stretch border-t border-[#e7e1d2] bg-[#fbf9f3] pb-safe shadow-[0_-1px_6px_rgba(0,0,0,0.05)]"
        aria-label="Main navigation"
      >
        {NAV_VIEWS.map((v) => {
          const active = view === v;
          return (
            <button
              key={v}
              onClick={() => setView(v)}
              data-tour={isMobile ? `nav-${v}` : undefined}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 min-h-[52px] flex-col items-center justify-center gap-1 py-1.5 text-[10px] font-semibold leading-none transition-colors focus-ring ${
                active ? "text-emerald-800" : "text-[#8a8577] hover:text-[#5f5b50]"
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex h-6 w-11 items-center justify-center rounded-full text-lg leading-none transition-colors ${active ? "bg-emerald-100" : ""}`}
              >
                {VIEW_META[v].icon}
              </span>
              {VIEW_META[v].label}
            </button>
          );
        })}
      </nav>

      {!lifecycleOverlayOpen && (
        <LifecyclePromptToast prompt={lifecycle.prompt} onAct={lifecycle.act} onDismiss={lifecycle.dismiss} />
      )}

      <Suspense fallback={null}>
        {settingsOpen && (
          <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} onOpenChat={() => { setChatInitialPrompt(undefined); setChatOpen(true); }} countries={store.myListCountries} homeCountry={homeCountry} onHomeCountryChange={setHomeCountry} budgetBasis={globalBasis} onBudgetBasisChange={setGlobalBasis} />
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
              store.recentsSet.has(aiPlanResult.destinationName) ||
              store.myListNames.some((n) => n.toLowerCase() === aiPlanResult.destinationName.toLowerCase())
                ? undefined : handleSaveAiToList
            }
            existingPlans={aiPlanStore.getPlans(aiPlanResult.destinationName)}
            canAddNew={aiPlanStore.canAddNew(aiPlanResult.destinationName)}
            maxPlans={aiPlanStore.maxPlans}
            onSavePlan={() => { if (aiPlanResult) { aiPlanStore.savePlan(aiPlanResult); } }}
            onReplacePlan={(id) => { if (aiPlanResult) { aiPlanStore.replacePlan(id, aiPlanResult); } }}
          />
        )}

        <FreTour
          canPromptInstall={installPrompt.canPrompt}
          isInstalled={installPrompt.isInstalled || installPrompt.installedInBrowser}
          isIOS={installPrompt.isIOS}
          onInstall={installPrompt.promptInstall}
        />
      </Suspense>
    </div>
  );
}
