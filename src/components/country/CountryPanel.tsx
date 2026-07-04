import { useState, useEffect, useMemo, useRef, useCallback, Suspense } from "react";
import type { RefObject } from "react";
import type maplibregl from "maplibre-gl";
import type { Country } from "../../core/types";
import type { SavedAiPlan } from "../../hooks/useAiPlanStore";
import { generateTripPlan, getMaxRuleDays, getRecRuleDays, recommendedDaysForSelection } from "../../core/utils/tripPlans";
import type { TripPlan } from "../../core/utils/tripPlans";
import type { BudgetBasis } from "../../core/utils/budget";
import { budgetForBasis } from "../../core/utils/budget";
import { getBudgetTier } from "../../core/utils/filterLogic";
import { mergeCountryData } from "../../core/utils/countryData";
import { usePanelDrag } from "../../hooks/usePanelDrag";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { useCountryRule } from "../../hooks/useCountryRule";
import { useBackDismiss } from "../../hooks/useBackDismiss";
import { useConfirm } from "../shared/ConfirmDialog";
import PanelHeader from "./panel/PanelHeader";
import PlanPreview from "./panel/PlanPreview";
import MonthHeatmap from "./panel/MonthHeatmap";
import CityCard from "./panel/CityCard";
import TripReadiness from "./panel/TripReadiness";
import ShareButton from "./panel/ShareButton";
import { CollapsibleSection } from "./panel/PanelSection";
import { LearnAboutSection, PlanningResourcesSection, UsefulLinksSection } from "./panel/InfoSections";
import { getRangePercent } from "./panel/utils";
import { lazyWithRetry as lazy } from "../../utils/lazyWithRetry";

// Lazy-load heavy sub-components — only fetched when user triggers them
const ItineraryCinematic = lazy(() => import("./ItineraryCinematic"));
const ItineraryModal = lazy(() => import("./ItineraryModal"));
const PlanCompareModal = lazy(() => import("./PlanCompareModal"));

type Props = {
  country: Country | null;
  onClose: () => void;
  onSelectCountry?: (country: Country) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  isVisited: boolean;
  onToggleVisited: () => void;
  onEdit: () => void;
  onUpdateNotes: (notes: string) => void;
  homeCountry: string;
  budgetBasis: BudgetBasis;
  mainMapRef?: RefObject<maplibregl.Map | null>;
  allCountries?: Country[];
  resolveCountry?: (name: string) => Country | null;
  onPlanWithAi?: (countryName: string) => void;
  aiPlans?: SavedAiPlan[];
  onDeleteAiPlan?: (planId: string) => void;
  onCinematicChange?: (active: boolean) => void;
};

export default function CountryPanel({
  country, onClose,
  onSelectCountry,
  isFavorite, onToggleFavorite,
  isVisited, onToggleVisited,
  onEdit, onUpdateNotes,
  homeCountry,
  budgetBasis,
  mainMapRef,
  allCountries,
  resolveCountry,
  onPlanWithAi,
  aiPlans = [],
  onDeleteAiPlan,
  onCinematicChange,
}: Props) {
  const { panelWidth, startPanelDrag, dragHandleProps } = usePanelDrag(400, 340);
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const { data: consolidated, rule, loading: ruleLoading } = useCountryRule(country?.name);
  const [activePlanId, setActivePlanId] = useState("default");
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedExperiences, setSelectedExperiences] = useState<string[]>([]);
  const [customDays, setCustomDays] = useState(7);
  const [notes, setNotes] = useState(country?.notes ?? "");
  const [notesSaved, setNotesSaved] = useState(false);
  const notesSaveTimerRef = useRef<number | null>(null);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [cinematicPlan, setCinematicPlan] = useState<TripPlan | null>(null);
  const [modalPlan, setModalPlan] = useState<TripPlan | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<"overview" | "plan" | "notes">("overview");
  const [confirm, ConfirmDialog] = useConfirm();
  const currentCountryNameRef = useRef<string | null>(country?.name ?? null);
  // Once the user drags the day slider, that value is "pinned": the four intent
  // knobs still drive the plan output, but they no longer re-suggest the day
  // count the user deliberately chose. Cleared when switching country, or when the
  // user taps "Reset to recommended". State (not a ref) so the reset affordance and
  // the "auto-tuned" hint stay in sync with the pinned status.
  const [daysPinned, setDaysPinned] = useState(false);

  const maxDays = getMaxRuleDays(rule) ?? 30;
  const recDays = getRecRuleDays(rule) ?? 7;
  const safeMaxDays = Math.max(maxDays, 1);
  const sliderPercent = getRangePercent(customDays, safeMaxDays);
  const recPercent = getRangePercent(Math.min(recDays, safeMaxDays), safeMaxDays);
  // Overlay loaded rule data onto the (possibly minimal) country so combine-with
  // targets and not-yet-enriched entries render full details.
  const displayCountry = useMemo(
    () => (country ? mergeCountryData(country, consolidated) : null),
    [country, consolidated],
  );
  const bestMonths = displayCountry?.bestMonths ?? [];
  const worstMonths = displayCountry?.worstMonths ?? [];
  const primaryStyle = displayCountry?.travelStyle?.[0];

  // Reset panel state when switching to a different country.
  useEffect(() => {
    currentCountryNameRef.current = country?.name ?? null;
    setDaysPinned(false);
    setActivePlanId("default");
    setSelectedCities([]);
    setSelectedExperiences([]);
    setNotes(country?.notes ?? "");
    setCinematicPlan(null);
    setModalPlan(null);
    setCompareOpen(false);
    setPanelTab("overview");
  }, [country?.name]);

  // Recommended trip length for the current Plan selections — reacts to travel
  // style, budget (both edited via the form), and the panel-local experience and
  // city focus. Purely local: never touches App/Calendar state.
  const budgetTier = useMemo(
    () => (displayCountry ? getBudgetTier(budgetForBasis(displayCountry, budgetBasis)) : undefined),
    [displayCountry, budgetBasis],
  );
  const recommendedDays = useMemo(
    () =>
      recommendedDaysForSelection({
        rule,
        style: primaryStyle,
        recDays,
        maxDays: safeMaxDays,
        selectedCities,
        selectedExperiences,
        budgetTier,
      }),
    [rule, primaryStyle, recDays, safeMaxDays, selectedCities, selectedExperiences, budgetTier],
  );

  // Re-seed the day slider whenever the recommendation changes (style/budget from
  // edit, or experience/city focus) — unless the user has pinned it by dragging.
  // A pinned value survives filter changes; switching country or tapping "Reset to
  // recommended" clears the pin, letting this effect re-seed the suggested length.
  useEffect(() => {
    if (!daysPinned) setCustomDays(recommendedDays);
  }, [recommendedDays, daysPinned]);

  // Debounced notes auto-save (300ms)
  const debouncedSave = useCallback((text: string) => {
    if (notesSaveTimerRef.current) window.clearTimeout(notesSaveTimerRef.current);
    notesSaveTimerRef.current = window.setTimeout(() => {
      onUpdateNotes(text);
      setNotesSaved(true);
      notesSaveTimerRef.current = window.setTimeout(() => setNotesSaved(false), 2000);
    }, 300);
  }, [onUpdateNotes]);

  // Cleanup timers on unmount or country change
  useEffect(() => {
    return () => {
      if (notesSaveTimerRef.current) window.clearTimeout(notesSaveTimerRef.current);
    };
  }, [country?.name]);

  useEffect(() => {
    if (activePlanId !== "default" && !aiPlans.find((p) => p.id === activePlanId)) {
      setActivePlanId("default");
    }
  }, [activePlanId, aiPlans]);

  useEffect(() => {
    onCinematicChange?.(cinematicPlan !== null);
  }, [cinematicPlan, onCinematicChange]);

  // On mobile, the device Back button exits cinematic mode before closing the panel.
  useBackDismiss(cinematicPlan !== null && isMobile, () => setCinematicPlan(null));

  // Close the panel on Escape, unless a sub-overlay (modal, compare, cinematic,
  // or expanded notes) is open — those own the Escape key while active.
  useEffect(() => {
    if (!country) return;
    const overlayOpen = cinematicPlan !== null || modalPlan !== null || compareOpen || notesExpanded;
    if (overlayOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [country, cinematicPlan, modalPlan, compareOpen, notesExpanded, onClose]);

  const planOptions = useMemo(() => {
    const opts: { id: string; label: string; plan: TripPlan }[] = [];
    if (displayCountry) {
      const defaultPlan = generateTripPlan(displayCountry, "custom", selectedCities, customDays, rule, budgetBasis, selectedExperiences);
      opts.push({ id: "default", label: "📅 Default", plan: defaultPlan });
      for (let i = 0; i < aiPlans.length; i++) {
        const sp = aiPlans[i];
        const dayCount = sp.result.plan.days.length;
        opts.push({ id: sp.id, label: `✨ AI ${i + 1} · ${dayCount}d`, plan: sp.result.plan });
      }
    }
    return opts;
  }, [displayCountry, selectedCities, selectedExperiences, customDays, aiPlans, rule, budgetBasis]);

  const activePlan = planOptions.find((o) => o.id === activePlanId) ?? planOptions[0];
  const isDefaultActive = activePlanId === "default";

  const toggleCity = useCallback((name: string) => {
    setSelectedCities((prev) => prev.includes(name) ? prev.filter((city) => city !== name) : [...prev, name]);
  }, []);

  const toggleExperience = useCallback((tag: string) => {
    setSelectedExperiences((prev) => prev.includes(tag) ? prev.filter((e) => e !== tag) : [...prev, tag]);
  }, []);

  // When focus experiences are active, surface matching cities first (stable).
  const orderedCities = useMemo(() => {
    const cities = displayCountry?.cities ?? [];
    if (selectedExperiences.length === 0) return cities;
    const matches = (c: (typeof cities)[number]) =>
      (c.experiences ?? []).some((e) => selectedExperiences.includes(e));
    return [...cities].sort((a, b) => Number(matches(b)) - Number(matches(a)));
  }, [displayCountry?.cities, selectedExperiences]);

  return (
    <div
      className={`${
        isMobile
          ? "fixed inset-0 z-30 bg-white flex flex-col overflow-hidden transition-transform duration-300 ease-out"
          : "absolute top-0 right-0 h-full bg-white shadow-2xl z-20 flex flex-col overflow-hidden transition-transform duration-300 ease-out"
      } ${
        country && !cinematicPlan ? "translate-x-0" : "translate-x-full"
      }`}
      style={isMobile ? undefined : { width: panelWidth }}
    >
      {!isMobile && (
        <div
          className="absolute top-0 left-0 bottom-0 z-30 cursor-col-resize select-none group focus-ring rounded"
          style={{ width: 12 }}
          onPointerDown={startPanelDrag}
          {...dragHandleProps}
        >
          <div className="absolute inset-y-0 left-[5px] w-[2px] bg-gray-200 group-hover:bg-blue-400/60 transition-colors" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-[5px]">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="w-[3px] h-[3px] rounded-full bg-gray-300 group-hover:bg-blue-400/80 transition-colors" />
            ))}
          </div>
        </div>
      )}

      {displayCountry && (
        <>
          <PanelHeader
            country={displayCountry}
            consolidated={consolidated}
            ruleLoading={ruleLoading}
            homeCountry={homeCountry}
            recDays={recDays}
            budgetBasis={budgetBasis}
            isVisited={isVisited}
            onToggleVisited={onToggleVisited}
            isFavorite={isFavorite}
            onToggleFavorite={onToggleFavorite}
            onEdit={onEdit}
            onClose={onClose}
            extraActions={<ShareButton country={displayCountry} homeCountry={homeCountry} plan={activePlan?.plan} />}
          />

          {/* Tab bar */}
          <div className="flex items-center bg-white border-b border-gray-100 px-1" role="tablist" aria-orientation="horizontal">
            {PANEL_TABS.map((t) => (
              <button
                key={t.key}
                id={`tab-${t.key}`}
                role="tab"
                aria-selected={panelTab === t.key}
                aria-controls={`panel-${t.key}`}
                tabIndex={panelTab === t.key ? 0 : -1}
                onClick={() => setPanelTab(t.key)}
                className={`flex-1 py-2.5 text-center text-[11px] font-semibold transition-colors border-b-2 focus-ring ${
                  panelTab === t.key
                    ? "text-slate-900 border-slate-800"
                    : "text-gray-400 border-transparent hover:text-gray-600"
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div id={`panel-${panelTab}`} className="flex-1 overflow-y-auto px-5 py-4 space-y-3" role="tabpanel" aria-labelledby={`tab-${panelTab}`}>

            {/* ─── OVERVIEW TAB ─── */}
            {panelTab === "overview" && (
              <>
                <CollapsibleSection label="Trip readiness" defaultOpen={false}>
                  <TripReadiness
                    country={displayCountry}
                    isVisited={isVisited}
                    isFavorite={isFavorite}
                    aiPlanCount={aiPlans.length}
                    hasNotes={!!notes.trim()}
                  />
                </CollapsibleSection>

                {(bestMonths.length > 0 || worstMonths.length > 0) && (
                  <CollapsibleSection label="When to go" count={bestMonths.length + worstMonths.length}>
                    <MonthHeatmap bestMonths={bestMonths} worstMonths={worstMonths} />
                  </CollapsibleSection>
                )}

                {displayCountry.stopoverNote && (
                  <div className="rounded-xl bg-blue-50 border border-blue-100 px-3.5 py-2.5">
                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wide mb-1">✈️ Stopover tip</p>
                    <p className="text-xs leading-relaxed text-blue-800">{displayCountry.stopoverNote}</p>
                  </div>
                )}

                {displayCountry.avoid && displayCountry.avoid.length > 0 && (
                  <div className="rounded-xl bg-amber-50 border border-amber-100 px-3.5 py-2.5">
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-1.5">⚠️ Watch out for</p>
                    <ul className="space-y-1.5">
                      {displayCountry.avoid.map((item) => (
                        <li key={item} className="flex gap-2 text-xs leading-snug text-amber-800">
                          <span className="mt-0.5 shrink-0">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {displayCountry.combo && displayCountry.combo.length > 0 && (
                  <CollapsibleSection label="Combine with" count={displayCountry.combo.length}>
                    <div className="flex flex-wrap gap-1.5">
                      {displayCountry.combo.map((comboCountry) => (
                        <button
                          key={comboCountry}
                          onClick={() => {
                            const match = allCountries?.find((item) => item.name === comboCountry)
                              ?? resolveCountry?.(comboCountry);
                            if (match) onSelectCountry?.(match);
                          }}
                          className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 transition-colors hover:border-purple-300 hover:bg-purple-100 focus-ring"
                          title={`Open ${comboCountry}`}
                        >
                          {comboCountry}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1.5 text-[10px] text-gray-400">Highlighted in purple on the map</p>
                  </CollapsibleSection>
                )}

                <LearnAboutSection
                  countryName={displayCountry.name}
                  currentCountryNameRef={currentCountryNameRef}
                />

                <PlanningResourcesSection countryName={displayCountry.name} homeCountry={homeCountry} />

                <UsefulLinksSection links={displayCountry.links} />
              </>
            )}

            {/* ─── PLAN TAB ─── */}
            {panelTab === "plan" && (
              <>
                {planOptions.length > 1 && (
                  <div className="flex items-center gap-2">
                    <select
                      value={activePlanId}
                      onChange={(e) => setActivePlanId(e.target.value)}
                      className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition-colors focus:border-blue-400 focus-ring"
                    >
                      {planOptions.map((option) => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setCompareOpen(true)}
                      className="shrink-0 rounded-xl border border-indigo-100 px-2.5 py-2 text-[10px] font-bold text-indigo-600 transition-colors hover:bg-indigo-50 hover:text-indigo-800 focus-ring"
                    >
                      ⚖ Compare
                    </button>
                  </div>
                )}

                {isDefaultActive && (
                  <>
                    <div className="space-y-3 rounded-xl border border-blue-100 bg-white/80 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold text-gray-500">Trip length</p>
                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            Recommended <span className="text-blue-600">{recDays} days</span>
                          </p>
                        </div>
                        <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                          1–{safeMaxDays} days
                        </div>
                      </div>

                      {daysPinned ? (
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                          <span className="font-medium text-slate-500">Custom length</span>
                          {customDays !== recommendedDays && (
                            <button
                              type="button"
                              onClick={() => setDaysPinned(false)}
                              className="focus-ring inline-flex min-h-[32px] items-center gap-1 rounded-full px-2 py-1 font-semibold text-blue-600 transition-colors hover:bg-blue-50"
                              aria-label={`Reset trip length to the recommended ${recommendedDays} days`}
                            >
                              ↺ Reset to recommended ({recommendedDays}d)
                            </button>
                          )}
                        </div>
                      ) : (
                        <p className="mt-1.5 text-[11px] text-slate-400">
                          ✨ Auto-tuned to your style, budget & focus — drag to set your own
                        </p>
                      )}

                      <div className="relative px-1 pt-8">
                        <div
                          className="pointer-events-none absolute top-0 z-[1] -translate-x-1/2 rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm"
                          style={{ left: `${sliderPercent}%` }}
                        >
                          {customDays}d
                        </div>
                        <div className="relative h-6">
                          <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-slate-200" />
                          <div
                            className="absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                            style={{ width: `${sliderPercent}%` }}
                          />
                          <div
                            className="pointer-events-none absolute top-1/2 z-[1] h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-300 shadow-sm"
                            style={{ left: `${recPercent}%` }}
                            title={`Recommended: ${recDays} days`}
                          />
                          <input
                            type="range"
                            min={1}
                            max={safeMaxDays}
                            value={customDays}
                            onChange={(e) => {
                              setDaysPinned(true);
                              setCustomDays(parseInt(e.target.value));
                            }}
                            className="panel-v2-slider absolute inset-0 h-6 w-full cursor-pointer appearance-none bg-transparent"
                          />
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[10px] font-medium text-slate-400">
                          <span>1 day</span>
                          <span>{safeMaxDays} days</span>
                        </div>
                      </div>
                    </div>

                    {displayCountry.experiences.length > 0 && (
                      <CollapsibleSection label="Focus experiences" count={displayCountry.experiences.length} defaultOpen={false}>
                        <p className="mb-2 text-[11px] text-gray-500">Optional — shapes the itinerary toward what you pick</p>
                        <div className="flex flex-wrap gap-1.5">
                          {displayCountry.experiences.map((experience) => {
                            const active = selectedExperiences.includes(experience);
                            return (
                              <button
                                key={experience}
                                onClick={() => toggleExperience(experience)}
                                aria-pressed={active}
                                className={`min-h-[32px] rounded-full px-2.5 py-1 text-xs font-semibold transition-colors focus-ring ${
                                  active ? "bg-blue-600 text-white shadow-sm" : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                                }`}
                              >
                                {experience}
                              </button>
                            );
                          })}
                        </div>
                        {selectedExperiences.length > 0 && (
                          <button
                            onClick={() => setSelectedExperiences([])}
                            className="mt-2 text-[10px] font-semibold text-gray-400 transition-colors hover:text-gray-600 focus-ring rounded"
                          >
                            Clear focus ({selectedExperiences.length})
                          </button>
                        )}
                      </CollapsibleSection>
                    )}

                    {displayCountry.cities && displayCountry.cities.length > 0 && (
                      <CollapsibleSection label="Cities to visit" count={displayCountry.cities.length} defaultOpen={false}>
                        <p className="mb-2 text-[11px] text-gray-500">Optional — auto-selected if blank</p>
                        <div className="space-y-2">
                          {orderedCities.map((city) => (
                            <CityCard
                              key={city.name}
                              city={city}
                              selectable
                              selected={selectedCities.includes(city.name)}
                              onToggle={() => toggleCity(city.name)}
                              activeExperiences={selectedExperiences}
                            />
                          ))}
                        </div>
                        {selectedCities.length > 0 && (
                          <button
                            onClick={() => setSelectedCities([])}
                            className="mt-2 text-[10px] font-semibold text-gray-400 transition-colors hover:text-gray-600 focus-ring rounded"
                          >
                            Clear selection ({selectedCities.length})
                          </button>
                        )}
                      </CollapsibleSection>
                    )}
                  </>
                )}

                {!isDefaultActive && activePlan && (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-bold text-indigo-700">{activePlan.label}</p>
                      <p className="text-[10px] text-indigo-500">{activePlan.plan.days.length} days · {activePlan.plan.costPerPerson}</p>
                    </div>
                    {onDeleteAiPlan && (
                      <button
                        onClick={async () => {
                          const ok = await confirm({
                            title: "Delete AI plan?",
                            message: `"${activePlan?.label}" will be permanently removed.`,
                            confirmLabel: "Delete",
                            variant: "danger",
                          });
                          if (ok) onDeleteAiPlan(activePlanId);
                        }}
                        className="shrink-0 min-h-[32px] min-w-[32px] text-[10px] font-semibold text-red-400 transition-colors hover:text-red-600 focus-ring rounded"
                      >
                        🗑 Delete
                      </button>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  {isDefaultActive && onPlanWithAi && (
                    <button
                      onClick={() => onPlanWithAi(displayCountry.name)}
                      className="flex-1 rounded-xl border-2 border-emerald-200 bg-emerald-50 py-2.5 text-[11px] font-bold text-emerald-700 transition-colors hover:border-emerald-300 hover:bg-emerald-100 focus-ring"
                    >
                      ✨ Plan with AI
                    </button>
                  )}
                </div>

                {activePlan && (
                  <PlanPreview
                    key={`${activePlanId}-${isDefaultActive ? [...selectedCities].sort().join(",") : ""}-${isDefaultActive ? [...selectedExperiences].sort().join(",") : ""}-${isDefaultActive ? customDays : activePlan.plan.days.length}`}
                    country={displayCountry}
                    plan={activePlan.plan}
                    homeCountry={homeCountry}
                    onCinematic={setCinematicPlan}
                    onItinerary={setModalPlan}
                    isAiPlan={!isDefaultActive}
                    rule={rule}
                  />
                )}
              </>
            )}

            {/* ─── NOTES TAB ─── */}
            {panelTab === "notes" && (
              <>
                <div className="relative">
                  <textarea
                    className="w-full resize-none rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-gray-700 outline-none transition-colors placeholder:text-gray-400 focus:border-amber-400 focus-ring"
                    rows={8}
                    maxLength={4000}
                    placeholder="Jot down ideas, reminders, or anything to remember about this destination..."
                    value={notes}
                    onChange={(e) => { setNotes(e.target.value); setNotesSaved(false); debouncedSave(e.target.value); }}
                    onBlur={() => { onUpdateNotes(notes); setNotesSaved(true); if (notesSaveTimerRef.current) window.clearTimeout(notesSaveTimerRef.current); notesSaveTimerRef.current = window.setTimeout(() => setNotesSaved(false), 2000); }}
                    autoFocus
                  />
                  <button
                    onClick={() => setNotesExpanded(true)}
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors focus-ring rounded p-1"
                    title="Expand notes"
                    aria-label="Expand notes"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M10 2h4v4M6 14H2v-4M14 2L9 7M2 14l5-5"/></svg>
                  </button>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className={`text-[11px] font-medium transition-opacity duration-300 ${notesSaved ? "text-emerald-500 opacity-100" : "opacity-0"}`}>
                    ✓ Saved
                  </span>
                  <span className="text-[11px] text-gray-400">{notes.length.toLocaleString()} / 4,000</span>
                </div>

                {/* Notes expand modal */}
                {notesExpanded && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
                    onClick={() => setNotesExpanded(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Expanded notes for ${country?.name}`}
                    onKeyDown={(e) => { if (e.key === "Escape") setNotesExpanded(false); }}
                  >
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between px-5 py-3 border-b">
                        <h3 className="text-sm font-bold text-gray-800">📝 Notes — {country?.name}</h3>
                        <button onClick={() => setNotesExpanded(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none focus-ring rounded min-h-[32px] min-w-[32px] flex items-center justify-center" aria-label="Close">×</button>
                      </div>
                      <div className="flex-1 p-5 overflow-y-auto">
                        <textarea
                          className="w-full resize-none rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-gray-700 outline-none focus:border-amber-400 focus-ring"
                          rows={12}
                          maxLength={4000}
                          value={notes}
                          onChange={(e) => { setNotes(e.target.value); setNotesSaved(false); debouncedSave(e.target.value); }}
                          onBlur={() => { onUpdateNotes(notes); setNotesSaved(true); if (notesSaveTimerRef.current) window.clearTimeout(notesSaveTimerRef.current); notesSaveTimerRef.current = window.setTimeout(() => setNotesSaved(false), 2000); }}
                          autoFocus
                        />
                      </div>
                      <div className="flex items-center justify-between px-5 py-3 border-t">
                        <span className={`text-[11px] font-medium transition-opacity duration-300 ${notesSaved ? "text-emerald-500 opacity-100" : "opacity-0"}`}>
                          ✓ Saved
                        </span>
                        <span className="text-[11px] text-gray-400">{notes.length.toLocaleString()} / 4,000</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

          </div>
        </>
      )}

      <Suspense fallback={null}>
        {cinematicPlan && displayCountry && (
          <ItineraryCinematic
            plan={cinematicPlan}
            country={displayCountry}
            homeCountry={homeCountry}
            mainMapRef={mainMapRef}
            rule={rule}
            comboCountries={displayCountry.combo
              ?.map((name) => allCountries?.find((item) => item.name === name) ?? resolveCountry?.(name))
              .filter((item): item is Country => !!item)
              .map(({ name, lat, lng }) => ({ name, lat, lng }))}
            onClose={() => setCinematicPlan(null)}
          />
        )}
        {modalPlan && displayCountry && (
          <ItineraryModal
            plan={modalPlan}
            country={displayCountry}
            rule={rule}
            onClose={() => setModalPlan(null)}
          />
        )}
        {compareOpen && planOptions.length >= 2 && (
          <PlanCompareModal
            options={planOptions}
            onClose={() => setCompareOpen(false)}
          />
        )}
      </Suspense>
      <ConfirmDialog />
    </div>
  );
}

const PANEL_TABS = [
  { key: "overview" as const, icon: "🗺️", label: "Overview" },
  { key: "plan" as const, icon: "📋", label: "Plan" },
  { key: "notes" as const, icon: "📝", label: "Notes" },
];

