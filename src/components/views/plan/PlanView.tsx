import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import type maplibregl from "maplibre-gl";
import type { Country } from "../../../core/types";
import { BUDGET_BASIS_ORDER, BUDGET_BASIS_META, type BudgetBasis } from "../../../core/utils/budget";
import { STYLE_META } from "../../../core/utils/travelStyles";
import { popularDestinations } from "../../../core/data/popularDestinations";
import { planCostBasisIcon, planCostBasisLabel } from "../../../core/utils/tripPlans";
import type { TripPlan } from "../../../core/utils/tripPlans";
import { usePlanBuilder } from "../../../hooks/usePlanBuilder";
import { useBackDismiss } from "../../../hooks/useBackDismiss";
import PillGroup from "../../shared/PillGroup";
import CityCard from "../../country/panel/CityCard";
import DestinationPicker from "./DestinationPicker";
import PlanWorkspace from "./PlanWorkspace";
import PlanProgressSummary from "./PlanProgressSummary";
import type { PlanActions } from "./planActions";
import { loadPlanDraft, savePlanDraft, clearPlanDraft } from "./planDraft";

const ItineraryCinematic = lazy(() => import("../../country/ItineraryCinematic"));

type Props = {
  countries: Country[];
  visitedNames: Set<string>;
  budgetBasis: BudgetBasis;
  setBudgetBasis: (b: BudgetBasis) => void;
  homeCountry: string;
  onGoDiscover: () => void;
  onAddToList?: (countryName: string) => void;
  onPlanWithAi?: (countryName: string) => void;
  /** Feature actions shared with the Country Panel, threaded by destination name. */
  onToggleVisited?: (name: string) => void;
  favoriteNames?: Set<string>;
  onToggleFavorite?: (name: string) => void;
  onUpdateNotes?: (name: string, notes: string) => void;
  aiPlanCountFor?: (name: string) => number;
  mainMapRef?: RefObject<maplibregl.Map | null>;
  onCinematicChange?: (active: boolean) => void;
};

type StepKey = "basics" | "cities" | "review";

type StepMeta = { key: StepKey; icon: string; title: string; short: string; subtitle: string; optional?: boolean };

const STEP_META: Record<StepKey, StepMeta> = {
  basics: { key: "basics", icon: "🧭", title: "Trip basics", short: "Basics", subtitle: "Who's going and what you love — we shape the rest." },
  cities: { key: "cities", icon: "📍", title: "Which places?", short: "Places", subtitle: "Auto-picked from your vibe. Add or drop any to make it yours." },
  review: { key: "review", icon: "🗺️", title: "Your trip", short: "Review", subtitle: "" },
};

/**
 * Guided one-way planner. A step-by-step wizard — Basics (who + vibe) → Places →
 * Review — that replaces the bidirectional experiences↔cities filters. One
 * focused screen at a time; every step optional and smart-defaulted; trip length
 * is inferred behind the scenes and tunable on Review; cities are a result you
 * edit, never a filter that fights vibe.
 */
export default function PlanView({ countries, visitedNames, budgetBasis, setBudgetBasis, homeCountry, onGoDiscover, onAddToList, onPlanWithAi, onToggleVisited, favoriteNames, onToggleFavorite, onUpdateNotes, aiPlanCountFor, mainMapRef, onCinematicChange }: Props) {
  // Rehydrate a saved draft once so a refresh resumes where the user left off.
  const draft0 = useRef(loadPlanDraft()).current;
  const [picked, setPicked] = useState<Country | null>(() => {
    if (!draft0) return null;
    return countries.find((c) => c.name === draft0.country)
      ?? popularDestinations().find((c) => c.name === draft0.country)
      ?? null;
  });
  const [stepIndex, setStepIndex] = useState(() => (picked && draft0 ? draft0.step : 0));

  const builderInitial =
    draft0 && picked && draft0.country === picked.name
      ? { selectedCities: draft0.cities, selectedExperiences: draft0.experiences, customDays: draft0.days, daysPinned: draft0.pinned }
      : undefined;
  const builder = usePlanBuilder(picked, budgetBasis, builderInitial);
  const { displayCountry, ruleLoading, customDays, daysPinned, plan } = builder;

  // Persist the funnel so a refresh resumes it; clear once the user backs out.
  const { selectedCities: selCities, selectedExperiences: selExp } = builder;
  useEffect(() => {
    if (!picked) {
      clearPlanDraft();
      return;
    }
    savePlanDraft({
      country: picked.name,
      step: stepIndex,
      cities: selCities,
      experiences: selExp,
      days: customDays,
      pinned: daysPinned,
    });
  }, [picked, stepIndex, selCities, selExp, customDays, daysPinned]);

  // Cinematic fly-through overlay. Lives here (not in the pane) so it can drive
  // the always-mounted MapView behind the whole app via onCinematicChange, and
  // auto-closes when the traveller switches destinations.
  const [cinematicPlan, setCinematicPlan] = useState<TripPlan | null>(null);
  useEffect(() => { onCinematicChange?.(cinematicPlan !== null); }, [cinematicPlan, onCinematicChange]);
  useEffect(() => { setCinematicPlan(null); }, [picked?.name]);
  useEffect(() => () => onCinematicChange?.(false), [onCinematicChange]);

  const myListNames = useMemo(() => new Set(countries.map((c) => c.name)), [countries]);
  const exploreCountries = useMemo(
    () => popularDestinations().filter((c) => !myListNames.has(c.name)),
    [myListNames],
  );

  const experiences = displayCountry?.experiences ?? [];
  const cities = builder.orderedCities;

  // Basics → (Places, when the destination has cities) → Your trip. Cities are
  // also editable in the Review workspace's Shape rail (same builder state), so
  // the step seeds the picks and the rail keeps them tunable beside the plan.
  const steps = useMemo<StepKey[]>(() => {
    const keys: StepKey[] = ["basics"];
    if (cities.length > 0) keys.push("cities");
    keys.push("review");
    return keys;
  }, [cities.length]);

  // Device / browser Back walks back one wizard step (persistent guard) before
  // leaving #plan — but any open rail drawer (registered on top of this) is
  // dismissed first. Kept above the early return to satisfy the hooks rule.
  useBackDismiss(
    picked !== null && stepIndex > 0,
    () => setStepIndex((i) => Math.max(0, i - 1)),
    true,
  );

  if (!picked) {
    return (
      <DestinationPicker
        countries={countries}
        exploreCountries={exploreCountries}
        visitedNames={visitedNames}
        onPick={(c) => { setPicked(c); setStepIndex(0); }}
        onGoDiscover={onGoDiscover}
      />
    );
  }

  const notInList = !myListNames.has(picked.name);

  const safeIndex = Math.min(stepIndex, steps.length - 1);
  const current = STEP_META[steps[safeIndex]];
  const isReview = current.key === "review";
  // Non-review steps center vertically when short but scroll from the top when tall,
  // so they never float in blank space nor clip on small screens.
  const centerStep = !isReview;
  const atLast = safeIndex === steps.length - 1;
  const nextIsReview = steps[safeIndex + 1] === "review";

  const goTo = (i: number) => setStepIndex(Math.max(0, Math.min(i, steps.length - 1)));
  const changeDestination = () => { setPicked(null); setStepIndex(0); };

  // Country-bound feature actions shared by the header, right rail, and pane.
  const activeName = displayCountry?.name ?? picked.name;
  const primaryStyle = displayCountry?.travelStyle?.[0];
  const styleMeta = primaryStyle ? STYLE_META[primaryStyle] : null;
  const isVisited = visitedNames.has(activeName);
  const planActions: PlanActions = {
    isVisited,
    onToggleVisited: onToggleVisited ? () => onToggleVisited(activeName) : undefined,
    isFavorite: favoriteNames?.has(activeName) ?? false,
    onToggleFavorite: onToggleFavorite ? () => onToggleFavorite(activeName) : undefined,
    aiPlanCount: aiPlanCountFor?.(activeName) ?? 0,
    notes: displayCountry?.notes ?? "",
    onSaveNotes: onUpdateNotes ? (notes: string) => onUpdateNotes(activeName, notes) : undefined,
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#f7f4ec]">
      {/* Header: destination + progress */}
      <div className={`mx-auto w-full shrink-0 px-4 pt-3 sm:pt-4 ${isReview ? "max-w-[1400px]" : "max-w-2xl"}`}>
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700/80">Planning</p>
            <div className="flex items-center gap-2">
              <h1 className="truncate font-display text-lg font-semibold tracking-tight text-[#16241d] sm:text-xl">{picked.name}</h1>
              {styleMeta && (
                <span
                  title={styleMeta.description}
                  className={`hidden shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold sm:inline-flex ${styleMeta.badge}`}
                >
                  <span aria-hidden="true">{styleMeta.icon}</span> {styleMeta.label}
                </span>
              )}
            </div>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {planActions.onToggleVisited && (
              <button
                onClick={planActions.onToggleVisited}
                aria-pressed={isVisited}
                aria-label={isVisited ? "Mark as not visited" : "Mark as visited"}
                className={`focus-ring-emerald flex min-h-[32px] items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold shadow-sm transition-colors sm:px-3 ${
                  isVisited
                    ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                    : "border-[#e4dece] bg-white text-[#6f6a5d] hover:bg-[#f4f1e8]"
                }`}
              >
                <span aria-hidden="true">{isVisited ? "✅" : "○"}</span> <span className="hidden sm:inline">Visited</span>
              </button>
            )}
            {!isReview && plan && (
              <span className="flex items-center gap-1 rounded-full border border-[#e4dece] bg-white px-3 py-1 text-[11px] font-bold text-[#1e2a25] shadow-[0_1px_2px_rgba(20,40,30,0.05)]">
                📅 {plan.days.length}d · {plan.costPerPerson}
                <span title={planCostBasisLabel(plan)} aria-label={planCostBasisLabel(plan)}>{planCostBasisIcon(plan)}</span>
              </span>
            )}
          </div>
        </div>

        {notInList && onAddToList && (
          <button
            onClick={() => onAddToList(picked.name)}
            className="focus-ring-emerald mt-2 inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700 shadow-sm transition-colors hover:bg-emerald-100"
          >
            ＋ Add {picked.name} to your list
          </button>
        )}

        {/* Labeled, tappable stepper — doubles as back navigation (tap an
            earlier step to revisit it). Device/gesture Back walks steps too. */}
        <div className="mt-3 flex items-stretch gap-1.5" role="tablist" aria-label="Planning steps">
          {steps.map((s, i) => {
            const done = i < safeIndex;
            const active = i === safeIndex;
            return (
              <button
                key={s}
                role="tab"
                aria-selected={active}
                aria-label={`Step ${i + 1}: ${STEP_META[s].title}`}
                onClick={() => goTo(i)}
                className="focus-ring-emerald group flex flex-1 flex-col gap-1 rounded-lg py-1"
              >
                <span
                  className={`block h-1.5 rounded-full transition-colors ${
                    active ? "bg-emerald-700" : done ? "bg-emerald-500" : "bg-[#e0dacb] group-hover:bg-[#cfc9b8]"
                  }`}
                />
                <span
                  className={`text-left text-[10px] font-bold uppercase tracking-[0.1em] transition-colors ${
                    active ? "text-emerald-700" : done ? "text-emerald-600 group-hover:text-emerald-700" : "text-[#b3ad9c]"
                  }`}
                >
                  {STEP_META[s].short}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step body */}
      <div className={`mx-auto w-full px-4 ${isReview ? "max-w-[1400px] min-h-0 flex-1 overflow-hidden py-3" : "max-w-2xl flex-1 overflow-y-auto py-4"}`}>
        <div key={current.key} className={`plan-step-in w-full ${isReview ? "h-full" : centerStep ? "flex min-h-full flex-col justify-center" : ""}`}>
          {isReview ? (
            ruleLoading && !plan ? (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-[#e4dece] bg-white">
                <span className="text-sm text-[#a09a89]">Building your plan…</span>
              </div>
            ) : plan && displayCountry ? (
              <PlanWorkspace
                builder={builder}
                budgetBasis={budgetBasis}
                setBudgetBasis={setBudgetBasis}
                homeCountry={homeCountry}
                actions={planActions}
                onPlanWithAi={onPlanWithAi ? () => onPlanWithAi(displayCountry.name) : undefined}
                onCinematic={() => setCinematicPlan(plan)}
              />
            ) : (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-[#e4dece] bg-white">
                <span className="text-sm text-[#a09a89]">No itinerary available.</span>
              </div>
            )
          ) : (
            <>
              {/* Question header */}
              <div className="mb-5 text-center">
                <div className="mb-1 text-4xl" aria-hidden="true">{current.icon}</div>
                <div className="flex items-center justify-center gap-2">
                  <h2 className="font-display text-2xl font-semibold tracking-tight text-[#16241d]">{current.title}</h2>
                  {current.optional && (
                    <span className="rounded-full bg-[#efeadd] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#a09a89]">Optional</span>
                  )}
                </div>
                <p className="mx-auto mt-1.5 max-w-sm text-xs text-[#6f6a5d]">{current.subtitle}</p>
              </div>

              {current.key === "basics" && (
                <div className="mx-auto w-full max-w-md space-y-6">
                  {/* Party size */}
                  <section>
                    <p className="mb-2.5 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-800">Who's going?</p>
                    <div className="flex justify-center">
                      <PillGroup
                        options={BUDGET_BASIS_ORDER.map((b) => ({ key: b, label: `${BUDGET_BASIS_META[b].icon} ${BUDGET_BASIS_META[b].label}` }))}
                        value={budgetBasis}
                        onChange={(v) => setBudgetBasis(v as BudgetBasis)}
                        accent="emerald"
                      />
                    </div>
                  </section>

                  {/* Vibe — only when the destination carries experience tags */}
                  {experiences.length > 0 && (
                    <section>
                      <p className="mb-2.5 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-800">What are you into?</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {experiences.map((exp) => {
                          const active = builder.selectedExperiences.includes(exp);
                          return (
                            <button
                              key={exp}
                              onClick={() => builder.toggleExperience(exp)}
                              aria-pressed={active}
                              className={`focus-ring-emerald min-h-[40px] rounded-full border px-4 py-2 text-sm font-semibold transition-[transform,box-shadow,border-color,color] ${
                                active
                                  ? "border-emerald-700 bg-emerald-700 text-white shadow-sm"
                                  : "border-[#e4dece] bg-white text-[#1e2a25] hover:border-emerald-600 hover:text-emerald-800"
                              }`}
                            >
                              {exp}
                            </button>
                          );
                        })}
                      </div>
                      {/* Fixed-height slot so toggling selection never changes the block height. */}
                      <div className="mt-3 flex h-5 items-center justify-center">
                        {builder.selectedExperiences.length > 0 && (
                          <button
                            onClick={builder.clearExperiences}
                            className="focus-ring-emerald rounded text-[11px] font-semibold text-[#a09a89] transition-colors hover:text-[#6f6a5d]"
                          >
                            Clear ({builder.selectedExperiences.length})
                          </button>
                        )}
                      </div>
                    </section>
                  )}

                  {/* Live feedback so the step feels substantial, not empty */}
                  {plan && <PlanProgressSummary plan={plan} />}
                </div>
              )}

              {current.key === "cities" && (
                <div className="mx-auto max-w-md space-y-2">
                  {plan && <div className="pb-0.5"><PlanProgressSummary plan={plan} /></div>}
                  <div className="flex items-center justify-between px-0.5 pb-0.5">
                    <p className="text-[11px] font-medium text-[#6f6a5d]">
                      {builder.selectedCities.length > 0
                        ? `${builder.selectedCities.length} hand-picked`
                        : `Auto-picked ${builder.autoSelectedCities.length} · tap to fine-tune`}
                    </p>
                    {builder.selectedCities.length > 0 && (
                      <button
                        onClick={builder.clearCities}
                        className="focus-ring-emerald rounded text-[11px] font-semibold text-[#6f6a5d] transition-colors hover:text-emerald-800"
                      >
                        Reset to auto
                      </button>
                    )}
                  </div>
                  {cities.map((city) => {
                    const checked =
                      builder.selectedCities.length > 0
                        ? builder.selectedCities.includes(city.name)
                        : builder.autoSelectedCities.includes(city.name);
                    return (
                      <CityCard
                        key={city.name}
                        city={city}
                        selectable
                        variant="luxury"
                        selected={checked}
                        onToggle={() => builder.toggleCity(city.name)}
                        activeExperiences={builder.selectedExperiences}
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Sticky footer nav. On the Review step below lg, the workspace's mobile
          bar owns Back (merged with the rail triggers), so hide this there. */}
      <div className={`shrink-0 border-t border-[#e6e1d4] bg-[#f7f4ec]/90 px-4 py-3 backdrop-blur ${isReview ? "hidden lg:block" : ""}`}>
        <div className="mx-auto flex max-w-md items-center gap-3">
          <button
            onClick={() => (safeIndex === 0 ? changeDestination() : goTo(safeIndex - 1))}
            className="focus-ring-emerald min-h-[44px] rounded-full border border-[#e4dece] bg-white px-4 py-2 text-sm font-semibold text-[#6f6a5d] shadow-sm transition-colors hover:bg-[#f4f1e8]"
          >
            {safeIndex === 0 ? "↺ Change" : "← Back"}
          </button>
          {!atLast ? (
            <button
              onClick={() => goTo(safeIndex + 1)}
              className="focus-ring-emerald ml-auto flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-full bg-emerald-700 px-5 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-800"
            >
              {nextIsReview ? "See my plan 🗺️" : "Continue →"}
            </button>
          ) : (
            <span className="ml-auto text-[11px] font-semibold text-[#a09a89]">Tweak any step above to update your plan</span>
          )}
        </div>
      </div>

      {/* Cinematic fly-through overlay (drives the always-mounted MapView) */}
      {cinematicPlan && displayCountry && (
        <Suspense fallback={null}>
          <ItineraryCinematic
            plan={cinematicPlan}
            country={displayCountry}
            homeCountry={homeCountry}
            mainMapRef={mainMapRef}
            rule={builder.rule}
            onClose={() => setCinematicPlan(null)}
          />
        </Suspense>
      )}
    </div>
  );
}
