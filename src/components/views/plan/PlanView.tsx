import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import type maplibregl from "maplibre-gl";
import type { Country } from "../../../core/types";
import { type BudgetBasis } from "../../../core/utils/budget";
import { cityExperienceOptions } from "../../../core/utils/cityExperiences";
import { type TripSegment, extractPlanCities, planCostBasisIcon, planCostBasisLabel } from "../../../core/utils/tripPlans";
import { usePlanBuilder } from "../../../hooks/usePlanBuilder";
import { useBackDismiss } from "../../../hooks/useBackDismiss";
import DestinationPicker from "./steps/DestinationPicker";
import PlanTripHeader, { buildHeaderStats } from "./shell/PlanTripHeader";
import TripSaveBar from "./save/TripSaveBar";
import PlanReviewReveal from "./save/PlanReviewReveal";
import PlanSavedToast from "./save/PlanSavedToast";
import { usePlanTripRestore } from "./save/usePlanTripRestore";
import { usePlanAutoSave } from "./save/usePlanAutoSave";
import PlanCountrySwitcher from "./shell/PlanCountrySwitcher";
import TripReviewWorkspace from "./review/TripReviewWorkspace";
import { useReviewRoute } from "./review/useReviewRoute";
import PlanShareButton from "./save/PlanShareButton";
import PlanBasicsStep from "./steps/PlanBasicsStep";
import PlanPlacesStep, { type PlacesUnit, includedCount } from "./steps/PlanPlacesStep";
import type { PlanActions } from "./shell/planActions";
import { loadPlanDraft, savePlanDraft, clearPlanDraft } from "./shell/planDraft";
import { isEnabled } from "../../../core/featureFlags";
import { MAX_TRIP_UNITS } from "../../../core/utils/multiCountry";
import { tripSignature, type SavedTrip, type OpenTripRequest } from "../../../core/utils/savedTrips";
import { getDestinationSource } from "../../../core/trip/getDestinationSource";
import { useTripExperiences } from "../../../hooks/useTripExperiences";
import { useTripRules } from "../../../hooks/useTripRules";
import { useTripPlanner } from "../../../hooks/useTripPlanner";
import type { CinematicRoute } from "../../country/cinematic/engine";

const ItineraryCinematic = lazy(() => import("../../country/ItineraryCinematic"));

/**
 * How many route stops the header names explicitly before collapsing the rest
 * into a "+N" pill. The step's route timeline enumerates every stop, so the
 * header only needs a concise, overflow-proof anchor — this keeps it stable for
 * any number of long country names.
 */
const HEADER_ROUTE_STOPS = 2;

type Props = {
  countries: Country[];
  budgetBasis: BudgetBasis;
  setBudgetBasis: (b: BudgetBasis) => void;
  homeCountry: string;
  /** Persist the composed trip (single or multi) as a self-contained snapshot. */
  onSaveTrip?: (snapshot: Omit<SavedTrip, "id" | "favorite">) => void;
  /** Whether the saved trip with this route signature is favourited. */
  isTripFavorite?: (routeName: string) => boolean;
  /** Toggle the saved trip's favourite by route signature (acts on the trip). */
  onToggleTripFavorite?: (routeName: string) => void;
  onPlanWithAi?: (countryName: string) => void;
  /** Record destinations as "recently planned" (implicit My List) when they
   *  enter the funnel. Pre-bound in App to the country store. */
  onRecordPlanned?: (names: string[]) => void;
  onUpdateNotes?: (name: string, notes: string) => void;
  aiPlanCountFor?: (name: string) => number;
  /** Open a saved route in the wizard (jumps to Review) and rehydrate each stop's
   *  snapshot cities + length. Bump `nonce` to re-open. */
  openTrip?: OpenTripRequest | null;
  /** Reset the wizard to a fresh landing picker (My Trips "+ New trip" / "Plan a
   *  trip"). Bump the nonce to discard the in-progress selection + persisted
   *  draft; the saved trip snapshots in My Trips are untouched. */
  startNewNonce?: number;
  /** Resolve a saved trip for a picked country set (resume-vs-fresh prompt). */
  matchSavedTrip?: (countries: string[]) => SavedTrip | null;
  /** Shared always-mounted MapView the cinematic overlay animates over. */
  mainMapRef?: RefObject<maplibregl.Map | null>;
  /** Report cinematic open/close so App can reveal the hidden MapView. */
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
export default function PlanView({ countries, budgetBasis, setBudgetBasis, homeCountry, onSaveTrip, isTripFavorite, onToggleTripFavorite, onPlanWithAi, onRecordPlanned, onUpdateNotes, aiPlanCountFor, openTrip, startNewNonce, matchSavedTrip, mainMapRef, onCinematicChange }: Props) {
  // Rehydrate a saved draft once so a refresh resumes where the user left off.
  const draft0 = useRef(loadPlanDraft()).current;
  const multiCountry = isEnabled("multiCountryPlanning");
  // Scope data source. International (world countries) today; a future Domestic
  // (India cities) scope slots in via getDestinationSource without wizard changes.
  const source = getDestinationSource("international");
  const resolveCountry = (name: string): Country | null =>
    countries.find((c) => c.name === name)
    ?? source.resolveUnit(name)
    ?? null;
  // The ordered trip selection. The first entry is the active/primary destination
  // the wizard currently plans; multi-country composition builds on the rest.
  const [selection, setSelection] = useState<Country[]>(() => {
    if (!draft0) return [];
    return draft0.countries.map(resolveCountry).filter((c): c is Country => c !== null);
  });
  const picked = selection[0] ?? null;
  const [stepIndex, setStepIndex] = useState(() => (picked && draft0 ? draft0.step : 0));

  // The prebuilt route the cinematic overlay plays. Non-null ⇒ overlay open.
  // One overlay serves single and multi (the route model is scope-agnostic).
  const [cinematicRoute, setCinematicRoute] = useState<CinematicRoute | null>(null);

  // Open / resume / reset lifecycle: reopening a saved trip (My Trips or a
  // same-set "Resume" prompt), the "+ New trip" reset, and the per-stop restore
  // seeds that `usePlanBuilder` (primary) and `useTripPlanner` (additional stops)
  // apply. `reopenedRef` is shared with the auto-save hook so "resume" stays silent.
  const restore = usePlanTripRestore({
    countries,
    resolveCountry,
    openTrip,
    startNewNonce,
    matchSavedTrip,
    onRecordPlanned,
    setSelection,
    setStepIndex,
    setBudgetBasis,
  });

  const builderInitial =
    draft0 && picked && draft0.countries[0] === picked.name
      ? { selectedCities: draft0.cities, selectedExperiences: draft0.experiences, customDays: draft0.days, daysPinned: draft0.pinned }
      : undefined;
  const builder = usePlanBuilder(picked, budgetBasis, builderInitial, restore.primarySeed);
  const { displayCountry, ruleLoading, customDays, daysPinned, plan } = builder;

  // Persist the funnel so a refresh resumes it; clear once the user backs out.
  const { selectedCities: selCities, selectedExperiences: selExp } = builder;
  useEffect(() => {
    if (selection.length === 0) {
      clearPlanDraft();
      return;
    }
    savePlanDraft({
      countries: selection.map((c) => c.name),
      step: stepIndex,
      cities: selCities,
      experiences: selExp,
      days: customDays,
      pinned: daysPinned,
    });
  }, [selection, stepIndex, selCities, selExp, customDays, daysPinned]);

  // Active country on the Places step — lifted here so the header's country
  // switcher and the Places body stay in lock-step (single source of truth).
  const [placesActiveIndex, setPlacesActiveIndex] = useState(0);

  const myListNames = useMemo(() => new Set(countries.map((c) => c.name)), [countries]);
  const exploreCountries = useMemo(
    () => source.popular().filter((c) => !myListNames.has(c.name)),
    [myListNames, source],
  );

  const experiences = displayCountry?.experiences ?? [];
  // A multi-unit route sources its vibe pills from the union of every selected
  // unit's experiences; a single unit keeps its own tags. Names are only passed
  // when multi so the single-unit path never triggers the extra union load.
  const multiUnitNames = useMemo(
    () => (selection.length > 1 ? selection.map((c) => c.name) : []),
    [selection],
  );
  const { experiences: tripExperiences } = useTripExperiences(multiUnitNames, source);
  const basicsExperiences = selection.length > 1 ? tripExperiences : experiences;

  // Additional stops (everything after the primary) get their own per-unit funnel
  // sharing the route's vibe + basis; the primary stays on `builder`. Composing
  // primary + additional stops yields one honest trip plan for the Places summary.
  const secondaryNames = useMemo(() => selection.slice(1).map((c) => c.name), [selection]);
  const { units: secondaryUnits } = useTripRules(secondaryNames, source);
  const tripPlanner = useTripPlanner(secondaryUnits, builder.selectedExperiences, budgetBasis, restore.tripSeed);

  const placesUnits = useMemo<PlacesUnit[]>(() => {
    if (!displayCountry) return [];
    // Primary Filters options come from the same authored per-city tags as the
    // additional stops (not the broader country-level `experiences`), and the
    // active focus is clamped to them so the badge/subline/chips stay in sync.
    const primaryOptions = cityExperienceOptions(builder.orderedCities);
    const primary: PlacesUnit = {
      name: displayCountry.name,
      orderedCities: builder.orderedCities,
      selectedCities: builder.selectedCities,
      autoSelectedCities: builder.autoSelectedCities,
      customDays: builder.customDays,
      activeExperiences: builder.selectedExperiences.filter((e) => primaryOptions.includes(e)),
      experienceOptions: primaryOptions,
      rule: builder.rule,
      onToggleCity: builder.toggleCity,
      onClearCities: builder.clearCities,
      onToggleExperience: builder.toggleExperience,
      onClearExperiences: builder.clearExperiences,
    };
    const rest = tripPlanner.unitPlans.map<PlacesUnit>((u) => ({
      name: u.name,
      orderedCities: u.orderedCities,
      selectedCities: u.selectedCities,
      autoSelectedCities: u.autoSelectedCities,
      customDays: u.customDays,
      activeExperiences: u.experiences,
      experienceOptions: u.experienceOptions,
      rule: u.rule,
      onToggleCity: u.toggleCity,
      onClearCities: u.clearCities,
      onToggleExperience: u.toggleExperience,
      onClearExperiences: u.clearExperiences,
    }));
    return [primary, ...rest];
  }, [displayCountry, builder, tripPlanner.unitPlans]);

  // Live per-stop day counts keyed by unit name, mirroring the forming plan's
  // *rendered* length per stop (not the requested pin, which the planner may
  // expand for tight city counts). Fed to the Basics route card so its per-stop
  // days + total exactly match the header's composed plan, instead of a pin/
  // recommended baseline that visibly drifts from the header total.
  const routeStopDays = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    if (displayCountry && plan) map[displayCountry.name] = plan.days.length;
    for (const u of tripPlanner.unitPlans) map[u.name] = u.plan.days.length;
    return map;
  }, [displayCountry, plan, tripPlanner.unitPlans]);

  // Keep the lifted Places active-country index valid as the route grows/shrinks.
  useEffect(() => {
    setPlacesActiveIndex((i) => Math.min(i, Math.max(0, placesUnits.length - 1)));
  }, [placesUnits.length]);

  // The composed plan across every stop (single-stop returns the primary plan
  // unchanged). Drives both the Places-step stats strip and the Review canvas.
  const composedTripPlan = useMemo(() => {
    if (!plan || !displayCountry || selection.length <= 1) return plan;
    const primarySegment: TripSegment = { name: displayCountry.name, plan };
    return tripPlanner.composedPlan(primarySegment);
  }, [plan, displayCountry, selection.length, tripPlanner]);

  const secondaryCountries = useMemo(
    () => secondaryUnits.map((u) => u.country),
    [secondaryUnits],
  );

  // The order-aware composed route — the single source of truth for the Review
  // canvas AND the header Share, so a reordered route shares exactly what's on
  // screen. Runs on every step (safe at empty/no-plan), obeying hook rules.
  const route = useReviewRoute({
    builder,
    unitPlans: tripPlanner.unitPlans,
    secondaryCountries,
    budgetBasis,
    homeCountry,
    canStartCinematic: !!mainMapRef,
  });

  // Cinematic overlay lifecycle. Report open/close so App reveals the hidden
  // MapView, and auto-close when the route identity changes (a different
  // selection means the played route no longer matches what's on screen).
  useEffect(() => {
    onCinematicChange?.(cinematicRoute !== null);
  }, [cinematicRoute, onCinematicChange]);
  const selectionSig = selection.map((c) => c.name).join(" → ");
  useEffect(() => {
    setCinematicRoute(null);
  }, [selectionSig]);
  useEffect(() => () => onCinematicChange?.(false), [onCinematicChange]);

  // Device / browser Back closes an open cinematic overlay first. It opens only
  // after the wizard is on Review (where the step guard is already registered),
  // so it lands on top of the LIFO back-stack — Back dismisses the cinematic
  // before it walks the wizard steps.
  useBackDismiss(cinematicRoute !== null, () => setCinematicRoute(null));

  const anyUnitHasCities = placesUnits.some((u) => u.orderedCities.length > 0);

  // Basics → (Places, when any stop has cities) → Your trip. Cities are also
  // editable in the Review workspace's Shape rail (same builder state), so the
  // step seeds the picks and the rail keeps them tunable beside the plan.
  const steps = useMemo<StepKey[]>(() => {
    const keys: StepKey[] = ["basics"];
    if (anyUnitHasCities) keys.push("cities");
    keys.push("review");
    return keys;
  }, [anyUnitHasCities]);

  // Device / browser Back walks back one wizard step (persistent guard) before
  // leaving #plan — but any open rail drawer (registered on top of this) is
  // dismissed first. Kept above the early return to satisfy the hooks rule.
  useBackDismiss(
    picked !== null && stepIndex > 0,
    () => setStepIndex((i) => Math.max(0, i - 1)),
    true,
  );

  // Auto-save the composed trip to My Trips on Review and celebrate the
  // first-ever Review, delegated to a dedicated hook (signature guard, silent
  // resume/hydration handling, first-run reveal + saved toast).
  const onReviewStep = steps[Math.min(stepIndex, steps.length - 1)] === "review";
  const { showReveal, closeReveal, revealSeconds, showSavedToast, dismissSavedToast } = usePlanAutoSave({
    onSaveTrip,
    onReviewStep,
    plan,
    displayCountry,
    selection,
    unitPlans: tripPlanner.unitPlans,
    composedTripPlan,
    budgetBasis,
    primaryCustomDays: builder.customDays,
    primaryExperiences: builder.selectedExperiences,
    reopenedRef: restore.reopenedRef,
  });

  if (!picked) {
    return (
      <>
        <DestinationPicker
          source={source}
          countries={countries}
          exploreCountries={exploreCountries}
          onStart={restore.handleStartSelection}
          multiSelect={multiCountry}
          maxSelection={MAX_TRIP_UNITS}
        />
        <restore.ResumeDialog />
      </>
    );
  }
  // Multi-country trip: the Basics step summarizes the whole route rather than a
  // single destination. The style badge stays hidden until the wizard plans each
  // country individually downstream; favorite/visited actions live on the review
  // step (PlanWorkspace). The composed trip auto-saves to My Trips on Review; the
  // header's TripSaveBar confirms that and offers a single trip-favourite toggle.
  const isMulti = selection.length > 1;
  const routeName = tripSignature(selection.map((c) => c.name));

  const safeIndex = Math.min(stepIndex, steps.length - 1);
  const current = STEP_META[steps[safeIndex]];
  const isReview = current.key === "review";
  const isPlaces = current.key === "cities";
  const isBasics = current.key === "basics";
  // Basics + Places sit on an elevated "stage" on desktop (a bordered white
  // panel in the canvas) so short steps read as an intentional, luxe focal
  // surface instead of floating on empty ivory. The stage top-aligns under the
  // header/stepper (rather than vertical-centering) so the eye flows
  // header → stepper → content without a large floating void above the card;
  // the canvas stays scrollable via overflow-y-auto on tall panels/short
  // viewports. Basics still centres its content vertically on mobile; Places
  // top-aligns. Review keeps its own full-width workspace. `centerStep` covers
  // any future narrow step.
  const staged = isBasics || isPlaces;
  const stageCard =
    "lg:rounded-[28px] lg:border lg:border-line lg:bg-white lg:px-10 lg:py-9 lg:shadow-[0_14px_46px_rgba(20,40,30,0.07)]";
  const centerStep = !isReview && !isPlaces && !isBasics;
  const atLast = safeIndex === steps.length - 1;
  const nextIsReview = steps[safeIndex + 1] === "review";

  const goTo = (i: number) => setStepIndex(Math.max(0, Math.min(i, steps.length - 1)));
  const changeDestination = () => { setSelection([]); setStepIndex(0); };
  // Mobile Review has no wizard footer (hidden below lg), so the workspace's own
  // bottom bar owns Back + Plan another there; desktop keeps the footer.
  const reviewNav = { onBack: () => goTo(safeIndex - 1), onPlanAnother: changeDestination };

  // Country-bound feature actions shared by the header, right rail, and pane.
  const activeName = displayCountry?.name ?? picked.name;
  const planActions: PlanActions = {
    aiPlanCount: aiPlanCountFor?.(activeName) ?? 0,
    notes: displayCountry?.notes ?? "",
    onSaveNotes: onUpdateNotes ? (notes: string) => onUpdateNotes(activeName, notes) : undefined,
  };

  // Progressive header stats — the composed plan across every stop (single-stop
  // returns the primary unchanged). Basics shows a forming estimate; Places and
  // Review are live. Hidden until an itinerary exists so the strip never lies.
  const statsPlan = composedTripPlan ?? plan;
  const headerStats = statsPlan
    ? buildHeaderStats(
        statsPlan,
        extractPlanCities(statsPlan.days).length,
        selection.length,
        planCostBasisIcon(statsPlan),
        planCostBasisLabel(statsPlan),
        current.key === "basics",
      )
    : undefined;

  // On the Places step the header hosts the country switcher (multi) so identity
  // and the body's active country stay in lock-step from a single source.
  const placesActive = Math.min(placesActiveIndex, Math.max(0, placesUnits.length - 1));
  const switcherNode =
    isPlaces && isMulti ? (
      <PlanCountrySwitcher
        units={placesUnits.map((u) => ({ name: u.name, places: includedCount(u), days: u.customDays }))}
        activeIndex={placesActive}
        onSelect={setPlacesActiveIndex}
        variant="light"
      />
    ) : undefined;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-surface-2">
      <PlanTripHeader
        selection={selection}
        routeStopLimit={HEADER_ROUTE_STOPS}
        saveSlot={
          isReview ? (
            <TripSaveBar
              isMulti={isMulti}
              favorite={isTripFavorite?.(routeName) ?? false}
              onToggleFavorite={onToggleTripFavorite ? () => onToggleTripFavorite(routeName) : undefined}
            />
          ) : undefined
        }
        shareSlot={
          isReview && displayCountry && route.ready ? (
            <PlanShareButton
              country={displayCountry}
              homeCountry={homeCountry}
              plan={route.orderedComposed}
              routeStops={route.routeStops}
            />
          ) : undefined
        }
        steps={steps.map((s) => ({ key: s, short: STEP_META[s].short, title: STEP_META[s].title }))}
        activeStep={safeIndex}
        onGoToStep={goTo}
        width={isReview ? "review" : isPlaces || isBasics ? "wide" : "narrow"}
        identitySlot={switcherNode}
        stats={isBasics ? undefined : headerStats}
        basis={isPlaces || isReview ? budgetBasis : undefined}
        onBasisChange={isPlaces || isReview ? setBudgetBasis : undefined}
      />

      {/* Step body */}
      <div className={`mx-auto w-full px-4 ${isReview ? "max-w-[1400px] min-h-0 flex-1 overflow-hidden py-3" : staged ? "max-w-5xl flex-1 overflow-y-auto overflow-x-hidden py-4 lg:py-8" : "max-w-2xl flex-1 overflow-y-auto overflow-x-hidden py-4"}`}>
        <div key={current.key} className={`plan-step-in w-full ${isReview ? "h-full" : isBasics ? `flex min-h-full flex-col justify-center lg:block lg:min-h-0 ${stageCard}` : isPlaces ? stageCard : centerStep ? "flex min-h-full flex-col justify-center lg:justify-start" : ""}`}>
          {isReview ? (
            ruleLoading && !plan ? (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-line bg-white">
                <span className="text-sm text-ink-4">Building your plan…</span>
              </div>
            ) : plan && displayCountry ? (
              <TripReviewWorkspace
                route={route}
                displayCountry={displayCountry}
                homeCountry={homeCountry}
                onPlanWithAi={onPlanWithAi ? () => onPlanWithAi(displayCountry.name) : undefined}
                notes={planActions.notes}
                onSaveNotes={planActions.onSaveNotes}
                nav={reviewNav}
                onStartCinematic={mainMapRef ? setCinematicRoute : undefined}
              />
            ) : (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-line bg-white">
                <span className="text-sm text-ink-4">No itinerary available.</span>
              </div>
            )
          ) : (
            <>
              {/* Question header — Basics uses a centered hero on mobile and a
                  left editorial header on desktop (consistent with Places);
                  Places owns its own editorial title, so skip it there. */}
              {current.key === "basics" && (
                <>
                  <div className="mb-5 text-center lg:hidden">
                    <div className="mb-1 text-4xl" aria-hidden="true">{current.icon}</div>
                    <div className="flex items-center justify-center gap-2">
                      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-1">{current.title}</h2>
                      {current.optional && (
                        <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-4">Optional</span>
                      )}
                    </div>
                    <p className="mx-auto mt-1.5 max-w-sm text-xs text-ink-2">
                      {current.subtitle}
                    </p>
                  </div>
                  <div className="mb-5 hidden lg:block">
                    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                      <span aria-hidden="true">{current.icon}</span> {current.title}
                    </p>
                    <h2 className="mt-1.5 font-display text-2xl font-bold leading-tight text-ink-1">
                      Who's going &amp; what you love?
                    </h2>
                    <p className="mt-1 text-[13px] leading-snug text-ink-3">
                      Set the essentials — we'll shape your trip from here.
                    </p>
                  </div>
                </>
              )}

              {current.key === "basics" && (
                <PlanBasicsStep
                  selection={selection}
                  source={source}
                  budgetBasis={budgetBasis}
                  setBudgetBasis={setBudgetBasis}
                  experiences={basicsExperiences}
                  selectedExperiences={builder.selectedExperiences}
                  onToggleExperience={builder.toggleExperience}
                  onClearExperiences={builder.clearExperiences}
                  stopDays={routeStopDays}
                  routeCost={statsPlan?.costPerPerson}
                  routeCostIcon={statsPlan ? planCostBasisIcon(statsPlan) : undefined}
                  routeCostLabel={statsPlan ? planCostBasisLabel(statsPlan) : undefined}
                />
              )}

              {current.key === "cities" && (
                <PlanPlacesStep units={placesUnits} activeIndex={placesActive} />
              )}
            </>
          )}
        </div>
      </div>

      {/* Sticky footer nav. On the Review step below lg, the workspace's mobile
          bar owns Back (merged with the rail triggers), so hide this there. */}
      <div className={`shrink-0 border-t border-line bg-surface-2/90 px-4 pt-3 pb-safe backdrop-blur ${isReview ? "hidden lg:block" : ""}`}>
        <div className="mx-auto flex max-w-md items-center gap-3">
          <button
            onClick={() => (safeIndex === 0 ? changeDestination() : goTo(safeIndex - 1))}
            className="focus-ring-emerald min-h-[44px] rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-2 shadow-sm transition-colors hover:bg-surface-2"
          >
            {safeIndex === 0 ? "↺ Destinations" : "← Back"}
          </button>
          {!atLast ? (
            <button
              onClick={() => goTo(safeIndex + 1)}
              className="focus-ring-emerald ml-auto flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-full bg-emerald-700 px-5 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-800"
            >
              {nextIsReview ? "See my plan 🗺️" : "Continue →"}
            </button>
          ) : (
            <button
              onClick={changeDestination}
              className="focus-ring-emerald ml-auto inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm transition-colors hover:bg-surface-2"
            >
              <span aria-hidden="true">＋</span> Plan another
            </button>
          )}
        </div>
      </div>

      {mainMapRef && cinematicRoute && (
        <Suspense fallback={null}>
          <ItineraryCinematic
            route={cinematicRoute}
            mainMapRef={mainMapRef}
            onClose={() => setCinematicRoute(null)}
          />
        </Suspense>
      )}

      <PlanReviewReveal
        open={showReveal}
        onClose={closeReveal}
        routeName={routeName}
        days={headerStats?.days ?? plan?.days.length ?? 0}
        cities={headerStats?.cities ?? 0}
        seconds={revealSeconds}
      />
      <PlanSavedToast open={showSavedToast} message={isMulti ? "Route saved to My Trips" : "Trip saved to My Trips"} onClose={dismissSavedToast} />
    </div>
  );
}
