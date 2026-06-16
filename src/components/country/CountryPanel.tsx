import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import type { RefObject } from "react";
import type maplibregl from "maplibre-gl";
import type { Country } from "../../core/types";
import type { SavedAiPlan } from "../../hooks/useAiPlanStore";
import { STYLE_META } from "../../core/utils/travelStyles";
import { generateTripPlan, getMaxRuleDays, getRecRuleDays, extractPlanCities } from "../../core/utils/tripPlans";
import type { TripPlan } from "../../core/utils/tripPlans";
import type { CountryRule } from "../../core/data/itineraryRules";
import { usePanelDrag } from "../../hooks/usePanelDrag";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { useCountryRule } from "../../hooks/useCountryRule";
import { isEnabled } from "../../core/featureFlags";
import { exportItineraryAsPdf } from "../../utils/pdfExport";
import { getBudgetDisplay } from "../../core/types";
import Tooltip from "../shared/Tooltip";
import { fetchCountryInfo, type CountryInfo } from "../../utils/countryInfo";
import { getPlanningLinks } from "../../utils/planningLinks";

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
  onFilterExperience: (tag: string) => void;
  activeExperiences: string[];
  onEdit: () => void;
  onUpdateNotes: (notes: string) => void;
  homeCountry: string;
  mainMapRef?: RefObject<maplibregl.Map | null>;
  allCountries?: Country[];
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
  onFilterExperience, activeExperiences,
  onEdit, onUpdateNotes,
  homeCountry,
  mainMapRef,
  allCountries,
  onPlanWithAi,
  aiPlans = [],
  onDeleteAiPlan,
  onCinematicChange,
}: Props) {
  const { panelWidth, startPanelDrag } = usePanelDrag(320, 320);
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const { data: consolidated, rule, loading: ruleLoading } = useCountryRule(country?.name);
  const [activePlanId, setActivePlanId] = useState("default");
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [customDays, setCustomDays] = useState(7);
  const [notes, setNotes] = useState(country?.notes ?? "");
  const [notesSaved, setNotesSaved] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [cinematicPlan, setCinematicPlan] = useState<TripPlan | null>(null);
  const [modalPlan, setModalPlan] = useState<TripPlan | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [countryInfo, setCountryInfo] = useState<CountryInfo | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoFetched, setInfoFetched] = useState(false);
  const currentCountryNameRef = useRef<string | null>(country?.name ?? null);

  const maxDays = getMaxRuleDays(rule) ?? 30;
  const recDays = getRecRuleDays(rule) ?? 7;
  const safeMaxDays = Math.max(maxDays, 1);
  const sliderPercent = getRangePercent(customDays, safeMaxDays);
  const recPercent = getRangePercent(Math.min(recDays, safeMaxDays), safeMaxDays);
  const bestMonths = country?.bestMonths ?? [];
  const worstMonths = country?.worstMonths ?? [];
  const bestMonthSet = useMemo(() => new Set(bestMonths), [bestMonths]);
  const worstMonthSet = useMemo(() => new Set(worstMonths), [worstMonths]);
  const monthGrid = useMemo(
    () => MONTHS.filter((month) => bestMonthSet.has(month) || worstMonthSet.has(month)),
    [bestMonthSet, worstMonthSet],
  );

  useEffect(() => {
    currentCountryNameRef.current = country?.name ?? null;
    setActivePlanId("default");
    setSelectedCities([]);
    setCustomDays(recDays);
    setNotes(country?.notes ?? "");
    setCinematicPlan(null);
    setModalPlan(null);
    setCompareOpen(false);
    setCountryInfo(null);
    setInfoFetched(false);
    setInfoLoading(false);
  }, [country?.name, recDays]);

  const loadCountryInfo = useCallback(() => {
    if (infoFetched || infoLoading || !country) return;
    const targetName = country.name;
    setInfoLoading(true);
    fetchCountryInfo(targetName).then((info) => {
      if (currentCountryNameRef.current !== targetName) return;
      setCountryInfo(info);
      setInfoFetched(true);
      setInfoLoading(false);
    });
  }, [infoFetched, infoLoading, country]);

  useEffect(() => {
    if (activePlanId !== "default" && !aiPlans.find((p) => p.id === activePlanId)) {
      setActivePlanId("default");
    }
  }, [activePlanId, aiPlans]);

  useEffect(() => {
    onCinematicChange?.(cinematicPlan !== null);
  }, [cinematicPlan, onCinematicChange]);

  const planOptions = useMemo(() => {
    const opts: { id: string; label: string; plan: TripPlan }[] = [];
    if (country) {
      const defaultPlan = generateTripPlan(country, "custom", selectedCities, customDays, rule);
      opts.push({ id: "default", label: "📅 Default", plan: defaultPlan });
      for (let i = 0; i < aiPlans.length; i++) {
        const sp = aiPlans[i];
        const dayCount = sp.result.plan.days.length;
        opts.push({ id: sp.id, label: `✨ AI ${i + 1} · ${dayCount}d`, plan: sp.result.plan });
      }
    }
    return opts;
  }, [country, selectedCities, customDays, aiPlans, rule]);

  const activePlan = planOptions.find((o) => o.id === activePlanId) ?? planOptions[0];
  const isDefaultActive = activePlanId === "default";

  function toggleCity(name: string) {
    setSelectedCities((prev) => prev.includes(name) ? prev.filter((city) => city !== name) : [...prev, name]);
  }

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
          className="absolute top-0 left-0 bottom-0 z-30 cursor-col-resize select-none group"
          style={{ width: 12 }}
          onPointerDown={startPanelDrag}
        >
          <div className="absolute inset-y-0 left-[5px] w-[2px] bg-gray-200 group-hover:bg-blue-400/60 transition-colors" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-[5px]">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="w-[3px] h-[3px] rounded-full bg-gray-300 group-hover:bg-blue-400/80 transition-colors" />
            ))}
          </div>
        </div>
      )}

      {country && (
        <>
          <div className="sticky top-0 z-10 shrink-0 border-b border-blue-100 bg-gradient-to-b from-blue-50/80 to-white backdrop-blur-sm">
            <div className="px-5 pt-4 pb-3 space-y-3">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl leading-none">{getCountryFlag(country.name)}</span>
                      <h2 className="min-w-0 truncate text-xl font-bold text-gray-900 leading-tight">
                        {country.name}
                      </h2>
                    </div>
                  <p className="mt-1 text-xs font-medium text-gray-500">
                    {getBudgetDisplay(country.budget)} · from {homeCountry}
                    {ruleLoading && <span className="ml-2 text-[10px] text-blue-500">Loading itinerary…</span>}
                  </p>
                  </div>

                  <button
                   onClick={onClose}
                   className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                   aria-label="Close panel"
                  >
                   ✕
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {getBudgetBadges(country, consolidated).map((badge) => (
                    <span
                      key={badge.label}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${badge.className}`}
                    >
                      <span>{badge.icon}</span>
                      <span>{badge.label}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <IconToolbarButton
                  active={isVisited}
                  activeClassName="bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
                  icon={isVisited ? "✓" : "○"}
                  label={isVisited ? "Visited" : "Mark visited"}
                  onClick={onToggleVisited}
                />
                <IconToolbarButton
                  active={isFavorite}
                  activeClassName="bg-amber-100 text-amber-600 ring-1 ring-amber-200"
                  icon={isFavorite ? "★" : "☆"}
                  label={isFavorite ? "Favorite" : "Mark favorite"}
                  onClick={onToggleFavorite}
                />
                <IconToolbarButton icon="✏️" label="Edit country" onClick={onEdit} />
              </div>

              {country.travelStyle && country.travelStyle.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {country.travelStyle.map((style) => {
                    const meta = STYLE_META[style];
                    if (!meta) return null;
                    return (
                      <span key={style} className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${meta.badge}`}>
                        {meta.icon} {meta.label}
                        <Tooltip text={meta.description} />
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            <Section label="Plan your trip">
              {planOptions.length > 1 && (
                <div className="mb-3 flex items-center gap-2">
                  <select
                    value={activePlanId}
                    onChange={(e) => setActivePlanId(e.target.value)}
                    className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition-colors focus:border-blue-400"
                  >
                    {planOptions.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setCompareOpen(true)}
                    className="shrink-0 rounded-xl border border-indigo-100 px-2.5 py-2 text-[10px] font-bold text-indigo-600 transition-colors hover:bg-indigo-50 hover:text-indigo-800"
                  >
                    ⚖ Compare
                  </button>
                </div>
              )}

              {isDefaultActive && (
                <>
                  <div className="mb-3 space-y-3 rounded-xl border border-blue-100 bg-white/80 p-3">
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
                          onChange={(e) => setCustomDays(parseInt(e.target.value))}
                          className="panel-v2-slider absolute inset-0 h-6 w-full cursor-pointer appearance-none bg-transparent"
                        />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[10px] font-medium text-slate-400">
                        <span>1 day</span>
                        <span>{safeMaxDays} days</span>
                      </div>
                    </div>
                  </div>

                  {country.cities && country.cities.length > 0 && (
                    <CollapsibleSection label="Cities to visit" count={country.cities.length} defaultOpen={false}>
                      <p className="mb-2 text-[11px] text-gray-500">Optional — auto-selected if blank</p>
                      <div className="flex flex-wrap gap-1.5">
                        {country.cities.map((city) => {
                          const selected = selectedCities.includes(city.name);
                          return (
                            <button
                              key={city.name}
                              onClick={() => toggleCity(city.name)}
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-all ${
                                selected
                                  ? "border-slate-700 bg-slate-700 text-white shadow-sm"
                                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
                              }`}
                            >
                              {city.name}
                            </button>
                          );
                        })}
                      </div>
                      {selectedCities.length > 0 && (
                        <button
                          onClick={() => setSelectedCities([])}
                          className="mt-2 text-[10px] font-semibold text-gray-400 transition-colors hover:text-gray-600"
                        >
                          Clear selection
                        </button>
                      )}
                    </CollapsibleSection>
                  )}
                </>
              )}

              {!isDefaultActive && activePlan && (
                <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-bold text-indigo-700">{activePlan.label}</p>
                    <p className="text-[10px] text-indigo-500">{activePlan.plan.days.length} days · {activePlan.plan.costPerPerson}</p>
                  </div>
                  {onDeleteAiPlan && (
                    <button
                      onClick={() => onDeleteAiPlan(activePlanId)}
                      className="shrink-0 text-[10px] font-semibold text-red-400 transition-colors hover:text-red-600"
                    >
                      🗑 Delete
                    </button>
                  )}
                </div>
              )}

              <div className="mb-3 flex gap-2">
                {isDefaultActive && onPlanWithAi && (
                  <button
                    onClick={() => onPlanWithAi(country.name)}
                    className="flex-1 rounded-xl border-2 border-emerald-200 bg-emerald-50 py-2.5 text-[11px] font-bold text-emerald-700 transition-all hover:border-emerald-300 hover:bg-emerald-100"
                  >
                    ✨ Plan with AI
                  </button>
                )}
              </div>

              {activePlan && (
                <PlanPreview
                  key={`${activePlanId}-${isDefaultActive ? [...selectedCities].sort().join(",") : ""}-${isDefaultActive ? customDays : activePlan.plan.days.length}`}
                  country={country}
                  plan={activePlan.plan}
                  homeCountry={homeCountry}
                  onCinematic={setCinematicPlan}
                  onItinerary={setModalPlan}
                  isAiPlan={!isDefaultActive}
                  rule={rule}
                 
                />
              )}
            </Section>

            <Section label="When to go">
              <div className="grid grid-cols-3 gap-2">
                {monthGrid.map((month) => {
                  const monthClassName = bestMonthSet.has(month)
                    ? "border-l-4 border-emerald-400 bg-emerald-50/80 text-emerald-800"
                    : "border-l-4 border-red-400 bg-red-50/80 text-red-700";
                  return (
                    <div key={month} className={`rounded-lg px-2.5 py-2 text-xs font-semibold ${monthClassName}`}>
                      <p>{month}</p>
                      <p className="mt-0.5 text-[10px] font-medium opacity-75">
                        {bestMonthSet.has(month) ? "Best time" : "Avoid"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </Section>

            <CollapsibleSection label="Experiences" count={country.experiences.length}>
              <div className="flex flex-wrap gap-1.5">
                {country.experiences.map((experience) => {
                  const active = activeExperiences.includes(experience);
                  return (
                    <button
                      key={experience}
                      onClick={() => onFilterExperience(experience)}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${
                        active ? "bg-blue-600 text-white shadow-sm" : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                      }`}
                    >
                      {experience}
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            {country.cities && country.cities.length > 0 && (
              <CollapsibleSection label="Cities" count={country.cities.length}>
                <div className="space-y-2.5">
                  {country.cities.map((city) => (
                    <div key={city.name} className="rounded-xl border border-white/70 bg-white/80 px-3 py-2.5 shadow-sm shadow-slate-100">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-gray-800">{city.name}</p>
                        {city.bestMonths && city.bestMonths.length > 0 && (
                          <div className="flex gap-1">
                            {city.bestMonths.slice(0, 3).map((month) => (
                              <span key={month} className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                                {month.slice(0, 3)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {city.notes && <p className="mt-1 text-[11px] leading-snug text-gray-500">{city.notes}</p>}
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {country.stopoverNote && (
              <CollapsibleSection label="Stopover tip ✈️">
                <div className="rounded-xl bg-blue-50 px-3 py-2.5">
                  <p className="text-xs leading-relaxed text-blue-800">{country.stopoverNote}</p>
                </div>
              </CollapsibleSection>
            )}

            {country.avoid && country.avoid.length > 0 && (
              <CollapsibleSection label="Watch out for" count={country.avoid.length}>
                <ul className="space-y-2">
                  {country.avoid.map((item) => (
                    <li key={item} className="flex gap-2 text-sm leading-snug text-gray-600">
                      <span className="mt-0.5 shrink-0 font-bold text-amber-500">!</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CollapsibleSection>
            )}

            {country.combo && country.combo.length > 0 && (
              <CollapsibleSection label="Combine with" count={country.combo.length}>
                <div className="flex flex-wrap gap-1.5">
                  {country.combo.map((comboCountry) => (
                    <button
                      key={comboCountry}
                      onClick={() => {
                        const match = allCountries?.find((item) => item.name === comboCountry);
                        if (match) onSelectCountry?.(match);
                      }}
                      className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 transition-colors hover:border-purple-300 hover:bg-purple-100"
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
              countryName={country.name}
              countryInfo={countryInfo}
              loading={infoLoading}
              onExpand={loadCountryInfo}
            />

            <PlanningResourcesSection countryName={country.name} />

            {country.links && country.links.length > 0 && (
              <CollapsibleSection label="Useful links" count={country.links.length}>
                <div className="space-y-2">
                  {country.links.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2 text-xs font-semibold text-blue-700 shadow-sm shadow-slate-100 transition-colors hover:bg-slate-100"
                    >
                      <span className="text-base">🔗</span>
                      <span className="flex-1 truncate">{link.label}</span>
                      <svg className="h-3 w-3 shrink-0 text-gray-400 transition-colors group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            <CollapsibleSection label="My notes">
              <div className="relative">
                <textarea
                  className="w-full resize-none rounded-xl border border-transparent bg-amber-50 px-3 py-2.5 pr-8 text-sm leading-relaxed text-gray-700 outline-none transition-colors placeholder:text-gray-400 focus:border-amber-300"
                  rows={4}
                  maxLength={4000}
                  placeholder="Jot down ideas, reminders, or anything to remember about this destination..."
                  value={notes}
                  onChange={(e) => { setNotes(e.target.value); setNotesSaved(false); }}
                  onBlur={() => { onUpdateNotes(notes); setNotesSaved(true); setTimeout(() => setNotesSaved(false), 2000); }}
                />
                <button
                  onClick={() => setNotesExpanded(true)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
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
            </CollapsibleSection>

            {/* Notes expand modal */}
            {notesExpanded && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setNotesExpanded(false)}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between px-5 py-3 border-b">
                    <h3 className="text-sm font-bold text-gray-800">📝 Notes — {country?.name}</h3>
                    <button onClick={() => setNotesExpanded(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Close">×</button>
                  </div>
                  <div className="flex-1 p-5 overflow-y-auto">
                    <textarea
                      className="w-full resize-none rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-gray-700 outline-none focus:border-amber-400"
                      rows={12}
                      maxLength={4000}
                      value={notes}
                      onChange={(e) => { setNotes(e.target.value); setNotesSaved(false); }}
                      onBlur={() => { onUpdateNotes(notes); setNotesSaved(true); setTimeout(() => setNotesSaved(false), 2000); }}
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
          </div>
        </>
      )}

      <Suspense fallback={null}>
        {cinematicPlan && country && (
          <ItineraryCinematic
            plan={cinematicPlan}
            country={country}
            homeCountry={homeCountry}
            mainMapRef={mainMapRef}
            rule={rule}
            comboCountries={country.combo
              ?.map((name) => allCountries?.find((item) => item.name === name))
              .filter((item): item is Country => !!item)
              .map(({ name, lat, lng }) => ({ name, lat, lng }))}
            onClose={() => setCinematicPlan(null)}
          />
        )}
        {modalPlan && country && (
          <ItineraryModal
            plan={modalPlan}
            country={country}
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
    </div>
  );
}

function PlanPreview({ country, plan, homeCountry, onCinematic, onItinerary, isAiPlan, rule }: {
  country: Country;
  plan: TripPlan;
  homeCountry: string;
  onCinematic: (plan: TripPlan) => void;
  onItinerary: (plan: TripPlan) => void;
  isAiPlan?: boolean;
  rule?: CountryRule | null;
}) {
  const hasRuleData = !!rule;

  // Unique ordered cities from plan (for route preview)
  const planCities = extractPlanCities(plan.days);

  // Cinematic requires rule data AND at least 2 plan cities with known coordinates
  const knownCityNames = new Set((country.cities ?? []).map((c) => c.name));
  const matchedCities = planCities.filter((c) => knownCityNames.has(c));
  const canCinematic = hasRuleData && matchedCities.length >= 2;

  const canExportPdf = isEnabled("pdfExport");

  const buttonCount = 1 + 1 + (canExportPdf ? 1 : 0);
  const gridCols = buttonCount >= 3 ? "grid-cols-3" : buttonCount === 2 ? "grid-cols-2" : "grid-cols-1";

  return (
    <div className="itinerary-card overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-100">
      {/* Summary bar */}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2.5 text-white">
        <span className="text-xs font-bold">{isAiPlan ? "✨" : "📅"} {plan.duration}</span>
        <span className="text-xs font-bold">{plan.costPerPerson} / person</span>
      </div>

      {plan.warning && (
        <div className="px-3 py-2 bg-amber-50 border-b border-amber-100">
          <p className="text-[11px] text-amber-700 leading-snug">{plan.warning}</p>
        </div>
      )}

      {/* City route preview */}
      {planCities.length > 1 && (
        <div className="overflow-x-auto scrollbar-hide border-b border-gray-100 px-3 py-2">
          <div className="min-w-max flex items-center gap-1.5">
          {planCities.map((city, i) => (
            <span key={city} className="flex items-center gap-1">
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700">
                {city}
              </span>
              {i < planCities.length - 1 && <span className="text-gray-300 text-[10px]">→</span>}
            </span>
          ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className={`p-2.5 grid gap-2 ${gridCols}`}>
        <button
          onClick={() => canCinematic && onCinematic(plan)}
          disabled={!canCinematic}
          className={`flex flex-col items-center gap-1 rounded-xl py-3.5 transition-all active:scale-[0.97] ${
            canCinematic
              ? "cursor-pointer border border-slate-200 bg-white text-slate-900 shadow-sm shadow-slate-100 hover:-translate-y-0.5 hover:shadow-md"
              : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
          }`}
          title={canCinematic ? "Watch animated journey" : "Cinematic not available for this country"}
        >
          <span className="text-2xl leading-none">🎬</span>
          <span className="text-[10px] font-black tracking-wide mt-0.5">Cinematic</span>
          <span className={`text-[9px] leading-none ${canCinematic ? "text-slate-400" : "text-gray-300"}`}>
            {canCinematic ? "animated journey" : "not available"}
          </span>
        </button>
        <button
          onClick={() => onItinerary(plan)}
          className="flex flex-col items-center gap-1 rounded-xl border border-blue-100 bg-blue-50 py-3.5 text-blue-700 shadow-sm shadow-blue-100/60 transition-all active:scale-[0.97] hover:-translate-y-0.5 hover:bg-blue-100 hover:shadow-md"
        >
          <span className="text-2xl leading-none">📋</span>
          <span className="text-[10px] font-black tracking-wide mt-0.5">Itinerary</span>
          <span className="text-[9px] text-blue-400 leading-none">day-by-day plan</span>
        </button>
        {canExportPdf && (
          <button
            onClick={() => exportItineraryAsPdf(plan, country, homeCountry)}
            className="flex flex-col items-center gap-1 rounded-xl border border-rose-100 bg-rose-50 py-3.5 text-rose-700 shadow-sm shadow-rose-100/60 transition-all active:scale-[0.97] hover:-translate-y-0.5 hover:bg-rose-100 hover:shadow-md"
          >
            <span className="text-2xl leading-none">📄</span>
            <span className="text-[10px] font-black tracking-wide mt-0.5">Export PDF</span>
            <span className="text-[9px] text-rose-400 leading-none">save & share</span>
          </button>
        )}
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-gray-50/50 p-3.5">
      <p className="mb-3 text-[11px] font-semibold text-gray-500">{label}</p>
      {children}
    </div>
  );
}

function CollapsibleSection({ label, count, defaultOpen = false, children }: {
  label: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl bg-gray-50/50 p-3.5">
      <button
        onClick={() => setOpen((state) => !state)}
        className="group flex w-full items-center gap-2 text-left"
      >
        <span className={`text-xs text-gray-400 transition-transform duration-300 ease-out ${open ? "rotate-90 text-blue-500" : ""}`}>▸</span>
        <span className="flex-1 text-[11px] font-semibold text-gray-500">{label}</span>
        {count !== undefined && (
          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-500 ring-1 ring-gray-200">
            {count}
          </span>
        )}
      </button>
      <div className={`grid transition-all duration-300 ease-out ${open ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <div className={`border-l pl-3 transition-colors duration-300 ${open ? "border-blue-200" : "border-transparent"}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function IconToolbarButton({
  icon,
  label,
  onClick,
  active = false,
  activeClassName,
  className = "",
}: {
  icon: string;
  label: string;
  onClick: () => void;
  active?: boolean;
  activeClassName?: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-base transition-all ${
        active ? activeClassName ?? "bg-slate-100 text-slate-700" : `bg-white text-gray-500 ring-1 ring-gray-200 hover:bg-gray-50 ${className}`
      }`}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const COUNTRY_FLAG_EMOJIS: Record<string, string> = {
  india: "🇮🇳",
  japan: "🇯🇵",
  thailand: "🇹🇭",
  vietnam: "🇻🇳",
  singapore: "🇸🇬",
  indonesia: "🇮🇩",
  malaysia: "🇲🇾",
  "sri-lanka": "🇱🇰",
  "south-korea": "🇰🇷",
  "north-korea": "🇰🇵",
  maldives: "🇲🇻",
  nepal: "🇳🇵",
  bhutan: "🇧🇹",
  uae: "🇦🇪",
  "united-arab-emirates": "🇦🇪",
  dubai: "🇦🇪",
  norway: "🇳🇴",
  iceland: "🇮🇸",
  switzerland: "🇨🇭",
  scotland: "🏴",
  uk: "🇬🇧",
  "united-kingdom": "🇬🇧",
  france: "🇫🇷",
  italy: "🇮🇹",
  spain: "🇪🇸",
  portugal: "🇵🇹",
  greece: "🇬🇷",
  austria: "🇦🇹",
  netherlands: "🇳🇱",
  denmark: "🇩🇰",
  germany: "🇩🇪",
  belgium: "🇧🇪",
  "czech-republic": "🇨🇿",
  turkey: "🇹🇷",
  egypt: "🇪🇬",
  morocco: "🇲🇦",
  kenya: "🇰🇪",
  tanzania: "🇹🇿",
  "south-africa": "🇿🇦",
  usa: "🇺🇸",
  "united-states": "🇺🇸",
  canada: "🇨🇦",
  mexico: "🇲🇽",
  peru: "🇵🇪",
  brazil: "🇧🇷",
  argentina: "🇦🇷",
  chile: "🇨🇱",
  australia: "🇦🇺",
  "new-zealand": "🇳🇿",
  hawaii: "🌺",
  antarctica: "🇦🇶",
};

const COUNTRY_NAME_ALIASES: Record<string, string> = {
  uk: "united-kingdom",
  usa: "united-states",
  uae: "united-arab-emirates",
  "czech-republic": "czechia",
  "myanmar": "myanmar-burma",
  "bosnia-and-herzegovina": "bosnia-herzegovina",
  "sao-tome-and-principe": "sao-tome-principe",
  "trinidad-and-tobago": "trinidad-tobago",
  "antigua-and-barbuda": "antigua-barbuda",
  "saint-lucia": "st-lucia",
  "saint-vincent-and-the-grenadines": "st-vincent-grenadines",
  "saint-kitts-and-nevis": "st-kitts-nevis",
  "ivory-coast": "cote-d-ivoire",
  "palestine": "palestinian-territories",
  "democratic-republic-of-the-congo": "congo-kinshasa",
  "republic-of-the-congo": "congo-brazzaville",
};

const COUNTRY_FLAG_BY_NAME = buildCountryFlagByName();

function getCountryFlag(countryName: string): string {
  const key = normalizeCountryKey(countryName);
  const aliasKey = COUNTRY_NAME_ALIASES[key] ?? key;

  return COUNTRY_FLAG_EMOJIS[key] ?? COUNTRY_FLAG_BY_NAME.get(aliasKey) ?? countryName.trim().charAt(0).toUpperCase() ?? "📍";
}

function normalizeCountryKey(name: string): string {
  return name
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildCountryFlagByName(): Map<string, string> {
  const map = new Map<string, string>();
  if (typeof Intl === "undefined" || typeof Intl.DisplayNames === "undefined") {
    return map;
  }

  try {
    const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
    for (let first = 65; first <= 90; first++) {
      for (let second = 65; second <= 90; second++) {
        const code = String.fromCharCode(first, second);
        const displayName = displayNames.of(code);
        if (!displayName || displayName === code) continue;
        const key = normalizeCountryKey(displayName);
        map.set(key, toFlagEmoji(code));
      }
    }
  } catch {
    // Ignore Intl edge-case failures and gracefully fall back.
  }

  return map;
}

function toFlagEmoji(code: string): string {
  const upper = code.toUpperCase();
  return String.fromCodePoint(
    127397 + upper.charCodeAt(0),
    127397 + upper.charCodeAt(1),
  );
}

function getBudgetBadges(
  country: Country,
  consolidated: ReturnType<typeof useCountryRule>["data"],
) {
  if (consolidated) {
    return [
      { icon: "👤", label: consolidated.budget.solo, className: "bg-slate-100 text-slate-600" },
      { icon: "👫", label: consolidated.budget.couple, className: "bg-blue-50 text-blue-600" },
      { icon: "👨‍👩‍👧‍👦", label: consolidated.budget.family4, className: "bg-purple-50 text-purple-600" },
    ];
  }

  return [
    { icon: "💸", label: getBudgetDisplay(country.budget), className: "bg-slate-100 text-slate-600" },
  ];
}

function getRangePercent(value: number, max: number) {
  if (max <= 1) return 0;
  return ((value - 1) / (max - 1)) * 100;
}

// ─── Learn about country ──────────────────────────────────────────────────────

function LearnAboutSection({ countryName, countryInfo, loading, onExpand }: {
  countryName: string;
  countryInfo: CountryInfo | null;
  loading: boolean;
  onExpand: () => void;
}) {
  const [open, setOpen] = useState(false);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) onExpand();
  };

  return (
    <div className="rounded-xl bg-gray-50/50 p-3.5">
      <button onClick={handleToggle} className="group flex w-full items-center gap-2 text-left">
        <span className={`text-xs text-gray-400 transition-transform duration-300 ease-out ${open ? "rotate-90 text-blue-500" : ""}`}>▸</span>
        <span className="flex-1 text-[11px] font-semibold text-gray-500">Learn about {countryName} 🌐</span>
      </button>
      <div className={`grid transition-all duration-300 ease-out ${open ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <div className={`border-l pl-3 transition-colors duration-300 ${open ? "border-blue-200" : "border-transparent"}`}>
            {loading && (
              <div className="flex items-center gap-2 py-2">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                <span className="text-[11px] text-blue-500">Loading info…</span>
              </div>
            )}
            {!loading && countryInfo && (
              <div className="space-y-3">
                {countryInfo.thumbnail && (
                  <img
                    src={countryInfo.thumbnail}
                    alt={countryName}
                    className="w-full h-32 object-cover rounded-lg"
                    loading="lazy"
                  />
                )}

                {(countryInfo.capital || countryInfo.currency || countryInfo.language) && (
                  <div className="flex flex-wrap gap-2">
                    {countryInfo.capital && (
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                        🏛️ {countryInfo.capital}
                      </span>
                    )}
                    {countryInfo.currency && (
                      <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
                        💰 {countryInfo.currency}
                      </span>
                    )}
                    {countryInfo.language && (
                      <span className="rounded-full bg-violet-50 border border-violet-200 px-2.5 py-1 text-[10px] font-semibold text-violet-700">
                        🗣️ {countryInfo.language}
                      </span>
                    )}
                  </div>
                )}

                <p className="text-xs leading-relaxed text-gray-600">{countryInfo.summary}</p>

                <a
                  href={`https://en.wikipedia.org/wiki/${encodeURIComponent(countryName.replace(/ /g, "_"))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-[10px] font-semibold text-blue-500 hover:text-blue-700 transition-colors"
                >
                  Read more on Wikipedia →
                </a>
              </div>
            )}
            {!loading && !countryInfo && open && (
              <p className="text-[11px] text-gray-400 py-1">Could not load info. Check your internet connection.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Planning resources ───────────────────────────────────────────────────────

function PlanningResourcesSection({ countryName }: { countryName: string }) {
  const links = useMemo(() => getPlanningLinks(countryName), [countryName]);

  return (
    <CollapsibleSection label="Planning resources 🧭" count={links.length}>
      <div className="space-y-2">
        {links.map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-2.5 rounded-xl bg-white/80 px-3 py-2.5 shadow-sm shadow-slate-100 transition-colors hover:bg-slate-100"
          >
            <span className="text-base mt-0.5">{link.emoji}</span>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-blue-700 group-hover:text-blue-800">{link.label}</span>
              <p className="text-[10px] text-gray-400 leading-snug mt-0.5">{link.description}</p>
            </div>
            <svg className="h-3 w-3 shrink-0 text-gray-400 transition-colors group-hover:text-blue-500 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        ))}
      </div>
    </CollapsibleSection>
  );
}
