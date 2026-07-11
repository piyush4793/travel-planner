import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import type maplibregl from "maplibre-gl";
import type { Country } from "../../../core/types";
import { type BudgetBasis } from "../../../core/utils/budget";
import { cityExperienceOptions } from "../../../core/utils/cityExperiences";
import { STYLE_META } from "../../../core/utils/travelStyles";
import { type TripPlan, type TripSegment, extractPlanCities, planCostBasisIcon, planCostBasisLabel } from "../../../core/utils/tripPlans";
import { usePlanBuilder, type PlanBuilderSeed } from "../../../hooks/usePlanBuilder";
import { useBackDismiss } from "../../../hooks/useBackDismiss";
import DestinationPicker from "./DestinationPicker";
import PlanTripHeader, { type HeaderStats } from "./PlanTripHeader";
import TripSaveBar from "./TripSaveBar";
import PlanCountrySwitcher from "./PlanCountrySwitcher";
import PlanWorkspace from "./PlanWorkspace";
import TripReviewWorkspace from "./TripReviewWorkspace";
import PlanBasicsStep from "./PlanBasicsStep";
import PlanPlacesStep, { type PlacesUnit, includedCount } from "./PlanPlacesStep";
import type { PlanActions } from "./planActions";
import { loadPlanDraft, savePlanDraft, clearPlanDraft } from "./planDraft";
import { isEnabled } from "../../../core/featureFlags";
import { MAX_TRIP_UNITS } from "../../../core/utils/multiCountry";
import { buildTripSnapshot, tripSignature, toOpenRequest, type SavedTrip, type SnapshotStop, type OpenTripRequest } from "../../../core/utils/savedTrips";
import { useConfirm } from "../../shared/ConfirmDialog";
import { getDestinationSource } from "../../../core/trip/getDestinationSource";
import { useTripExperiences } from "../../../hooks/useTripExperiences";
import { useTripRules } from "../../../hooks/useTripRules";
import { useTripPlanner, type TripPlannerSeed } from "../../../hooks/useTripPlanner";

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
  visitedNames: Set<string>;
  budgetBasis: BudgetBasis;
  setBudgetBasis: (b: BudgetBasis) => void;
  homeCountry: string;
  onGoDiscover: () => void;
  /** Persist the composed trip (single or multi) as a self-contained snapshot. */
  onSaveTrip?: (snapshot: Omit<SavedTrip, "id" | "favorite">) => void;
  /** Whether the saved trip with this route signature is favourited. */
  isTripFavorite?: (routeName: string) => boolean;
  /** Toggle the saved trip's favourite by route signature (acts on the trip). */
  onToggleTripFavorite?: (routeName: string) => void;
  onPlanWithAi?: (countryName: string) => void;
  /** Feature actions shared with the Country Panel, threaded by destination name. */
  onToggleVisited?: (name: string) => void;
  favoriteNames?: Set<string>;
  onToggleFavorite?: (name: string) => void;
  onUpdateNotes?: (name: string, notes: string) => void;
  aiPlanCountFor?: (name: string) => number;
  mainMapRef?: RefObject<maplibregl.Map | null>;
  onCinematicChange?: (active: boolean) => void;
  /** Open a saved route in the wizard (jumps to Review) and rehydrate each stop's
   *  snapshot cities + length. Bump `nonce` to re-open. */
  openTrip?: OpenTripRequest | null;
  /** Resolve a saved trip for a picked country set (resume-vs-fresh prompt). */
  matchSavedTrip?: (countries: string[]) => SavedTrip | null;
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
export default function PlanView({ countries, visitedNames, budgetBasis, setBudgetBasis, homeCountry, onGoDiscover, onSaveTrip, isTripFavorite, onToggleTripFavorite, onPlanWithAi, onToggleVisited, favoriteNames, onToggleFavorite, onUpdateNotes, aiPlanCountFor, mainMapRef, onCinematicChange, openTrip, matchSavedTrip }: Props) {
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

  // A reopened saved trip's per-stop snapshot (cities + tuned length), applied
  // once per nonce to rehydrate the funnel: the primary stop through
  // `usePlanBuilder`, the additional stops through `useTripPlanner`.
  const [restoreSeed, setRestoreSeed] = useState<
    { nonce: number; primary: { cities: string[]; days: number }; byCountry: Record<string, { cities: string[]; days: number }> } | null
  >(null);
  const primarySeed = useMemo<PlanBuilderSeed | null>(
    () => (restoreSeed ? { nonce: restoreSeed.nonce, ...restoreSeed.primary } : null),
    [restoreSeed],
  );
  const tripSeed = useMemo<TripPlannerSeed | null>(
    () => (restoreSeed ? { nonce: restoreSeed.nonce, byCountry: restoreSeed.byCountry } : null),
    [restoreSeed],
  );

  const builderInitial =
    draft0 && picked && draft0.countries[0] === picked.name
      ? { selectedCities: draft0.cities, selectedExperiences: draft0.experiences, customDays: draft0.days, daysPinned: draft0.pinned }
      : undefined;
  const builder = usePlanBuilder(picked, budgetBasis, builderInitial, primarySeed);
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

  // A saved route to rehydrate into the wizard — fed either by the `openTrip`
  // prop (My Trips reopen) or by the same-set "Resume" prompt on the landing
  // picker. Both paths share this one restore pipeline (DRY).
  const [pendingOpen, setPendingOpen] = useState<OpenTripRequest | null>(null);
  useEffect(() => {
    if (openTrip) setPendingOpen(openTrip);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openTrip?.nonce]);

  // Open a saved route: reseed the ordered selection, jump to Review, restore the
  // saved budget basis, and stage a per-stop restore (snapshot cities + tuned
  // length) that `usePlanBuilder` (primary) and `useTripPlanner` (additional
  // stops) apply. Review is the last step; index 2 lands there whether or not the
  // cities step is present yet (safeIndex clamps while rules load, then the
  // 3-step review shares the same index). Applied once per nonce so re-opening
  // the same trip works but a stale prop never clobbers in-progress edits.
  const appliedOpenNonce = useRef<number | null>(null);
  useEffect(() => {
    if (!pendingOpen || appliedOpenNonce.current === pendingOpen.nonce) return;
    const stopByName = new Map(pendingOpen.stops.map((s) => [s.country, s]));
    const resolved = pendingOpen.stops.map((s) => resolveCountry(s.country)).filter((c): c is Country => c !== null);
    // Only mark this open request as handled once the names actually resolve, so
    // an open that arrives before destination data is ready is retried rather than
    // permanently swallowed by a prematurely-stamped nonce.
    if (resolved.length === 0) return;
    appliedOpenNonce.current = pendingOpen.nonce;
    setSelection(resolved);
    setStepIndex(2);
    setBudgetBasis(pendingOpen.basis);
    // Align the restore payload to the *resolved* order, so an unresolvable stop
    // never shifts the primary/secondary split.
    const primaryStop = stopByName.get(resolved[0].name);
    const byCountry: Record<string, { cities: string[]; days: number }> = {};
    for (const c of resolved.slice(1)) {
      const s = stopByName.get(c.name);
      if (s) byCountry[c.name] = { cities: s.cities, days: s.days };
    }
    setRestoreSeed({
      nonce: pendingOpen.nonce,
      primary: primaryStop ? { cities: primaryStop.cities, days: primaryStop.days } : { cities: [], days: 7 },
      byCountry,
    });
    // Re-runs when the open request changes or destination data lands, but the
    // nonce guard above makes it idempotent per open, so it applies exactly once
    // and never clobbers in-progress edits. resolveCountry/setBudgetBasis stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingOpen, countries]);

  // Landing "Start trip": if the picked country set matches a saved trip, offer to
  // resume it (primary) or start fresh (secondary); otherwise start fresh.
  const [confirmResume, ResumeDialog] = useConfirm();
  const handleStartSelection = useCallback(async (chosen: Country[]) => {
    const match = matchSavedTrip?.(chosen.map((c) => c.name)) ?? null;
    if (match) {
      // Esc / click-outside = dismiss → stay on the landing picker (do nothing).
      // Only the explicit "Start fresh" button falls through to a fresh plan.
      let dismissed = false;
      const resume = await confirmResume({
        variant: "emerald",
        title: "Resume your saved plan?",
        message: `You've already planned “${match.name}”. Resume it with your saved places and trip lengths, or start fresh?`,
        confirmLabel: "Resume saved plan",
        cancelLabel: "Start fresh",
        onDismiss: () => { dismissed = true; },
      });
      if (resume) {
        setPendingOpen(toOpenRequest(match, Date.now()));
        return;
      }
      if (dismissed) return;
    }
    setSelection(chosen);
    setStepIndex(0);
  }, [matchSavedTrip, confirmResume]);

  // Cinematic fly-through overlay. Lives here (not in the pane) so it can drive
  // the always-mounted MapView behind the whole app via onCinematicChange, and
  // auto-closes when the traveller switches destinations.
  const [cinematicPlan, setCinematicPlan] = useState<TripPlan | null>(null);
  useEffect(() => { onCinematicChange?.(cinematicPlan !== null); }, [cinematicPlan, onCinematicChange]);
  useEffect(() => { setCinematicPlan(null); }, [picked?.name]);
  useEffect(() => () => onCinematicChange?.(false), [onCinematicChange]);

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
  const tripPlanner = useTripPlanner(secondaryUnits, builder.selectedExperiences, budgetBasis, tripSeed);

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

  // Live per-stop day counts keyed by unit name, mirroring the forming plan (each
  // unit's tuned length). Fed to the Basics route card so its per-stop days + total
  // track the header's composed plan and react to vibe/experience changes, instead
  // of showing a static recommended baseline that drifts from the header.
  const routeStopDays = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const u of placesUnits) map[u.name] = u.customDays;
    return map;
  }, [placesUnits]);

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

  // Auto-save the composed trip (single or multi) as a self-contained snapshot
  // the moment the traveller reaches Review, and keep it fresh as they tune the
  // plan there. Guarded by a content signature so identical renders don't re-write
  // localStorage; the store upserts by route name, so edits update the same trip
  // in place (preserving its id, favourite and original save time) rather than
  // duplicating. A finished trip is therefore never lost and stays browsable.
  const onReviewStep = steps[Math.min(stepIndex, steps.length - 1)] === "review";
  const savedTripSig = useRef<string | null>(null);
  useEffect(() => {
    if (!onSaveTrip || !onReviewStep || !plan || !displayCountry || selection.length === 0) return;
    // Build stops from the ordered selection so the saved route's identity always
    // matches what the traveller picked, attaching each stop's own loaded plan
    // where the destination has itinerary data (primary always does).
    const planByName = new Map(tripPlanner.unitPlans.map((u) => [u.name, u]));
    const stops: SnapshotStop[] = selection.map((c, i) => {
      if (i === 0) return { country: displayCountry.name, days: builder.customDays, plan };
      const u = planByName.get(c.name);
      return u ? { country: u.name, days: u.customDays, plan: u.plan } : { country: c.name, days: 0 };
    });
    const snapshot = buildTripSnapshot({ stops, composed: composedTripPlan ?? plan, basis: budgetBasis });
    const sig = JSON.stringify(snapshot.stops) + snapshot.totalDays + snapshot.costPerPerson + snapshot.basis;
    if (savedTripSig.current === sig) return;
    savedTripSig.current = sig;
    onSaveTrip(snapshot);
  }, [onSaveTrip, onReviewStep, plan, displayCountry, selection, tripPlanner.unitPlans, composedTripPlan, budgetBasis, builder.customDays]);

  if (!picked) {
    return (
      <>
        <DestinationPicker
          source={source}
          countries={countries}
          exploreCountries={exploreCountries}
          visitedNames={visitedNames}
          favoriteNames={favoriteNames}
          onStart={handleStartSelection}
          onGoDiscover={onGoDiscover}
          multiSelect={multiCountry}
          maxSelection={MAX_TRIP_UNITS}
        />
        <ResumeDialog />
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
  // Non-review steps center vertically when short but scroll from the top when tall,
  // so they never float in blank space nor clip on small screens. Places breaks out
  // to a wide two-column workspace on desktop, so it top-aligns like Review.
  const centerStep = !isReview && !isPlaces;
  const atLast = safeIndex === steps.length - 1;
  const nextIsReview = steps[safeIndex + 1] === "review";

  const goTo = (i: number) => setStepIndex(Math.max(0, Math.min(i, steps.length - 1)));
  const changeDestination = () => { setSelection([]); setStepIndex(0); };

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

  // Progressive header stats — the composed plan across every stop (single-stop
  // returns the primary unchanged). Basics shows a forming estimate; Places and
  // Review are live. Hidden until an itinerary exists so the strip never lies.
  const statsPlan = composedTripPlan ?? plan;
  const headerStats: HeaderStats | undefined = statsPlan
    ? {
        days: statsPlan.days.length,
        countries: selection.length,
        cities: extractPlanCities(statsPlan.days).length,
        cost: statsPlan.costPerPerson,
        costIcon: planCostBasisIcon(statsPlan),
        costLabel: planCostBasisLabel(statsPlan),
        estimate: current.key === "basics",
      }
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
        styleMeta={styleMeta}
        saveSlot={
          isReview ? (
            <TripSaveBar
              isMulti={isMulti}
              favorite={isTripFavorite?.(routeName) ?? false}
              onToggleFavorite={onToggleTripFavorite ? () => onToggleTripFavorite(routeName) : undefined}
            />
          ) : undefined
        }
        steps={steps.map((s) => ({ key: s, short: STEP_META[s].short, title: STEP_META[s].title }))}
        activeStep={safeIndex}
        onGoToStep={goTo}
        wide={isReview}
        identitySlot={switcherNode}
        stats={headerStats}
        basis={isPlaces || isReview ? budgetBasis : undefined}
        onBasisChange={isPlaces || isReview ? setBudgetBasis : undefined}
      />

      {/* Step body */}
      <div className={`mx-auto w-full px-4 ${isReview ? "max-w-[1400px] min-h-0 flex-1 overflow-hidden py-3" : isPlaces ? "max-w-5xl flex-1 overflow-y-auto overflow-x-hidden py-4" : "max-w-2xl flex-1 overflow-y-auto overflow-x-hidden py-4"}`}>
        <div key={current.key} className={`plan-step-in w-full ${isReview ? "h-full" : centerStep ? "flex min-h-full flex-col justify-center" : ""}`}>
          {isReview ? (
            ruleLoading && !plan ? (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-line bg-white">
                <span className="text-sm text-ink-4">Building your plan…</span>
              </div>
            ) : plan && displayCountry ? (
              isMulti ? (
                <TripReviewWorkspace
                  builder={builder}
                  unitPlans={tripPlanner.unitPlans}
                  secondaryCountries={secondaryCountries}
                  budgetBasis={budgetBasis}
                  homeCountry={homeCountry}
                  onPlanWithAi={onPlanWithAi ? () => onPlanWithAi(displayCountry.name) : undefined}
                  notes={planActions.notes}
                  onSaveNotes={planActions.onSaveNotes}
                />
              ) : (
                <PlanWorkspace
                  builder={builder}
                  budgetBasis={budgetBasis}
                  setBudgetBasis={setBudgetBasis}
                  homeCountry={homeCountry}
                  actions={planActions}
                  onPlanWithAi={onPlanWithAi ? () => onPlanWithAi(displayCountry.name) : undefined}
                  onCinematic={() => setCinematicPlan(plan)}
                />
              )
            ) : (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-line bg-white">
                <span className="text-sm text-ink-4">No itinerary available.</span>
              </div>
            )
          ) : (
            <>
              {/* Question header */}
              <div className="mb-5 text-center">
                <div className="mb-1 text-4xl" aria-hidden="true">{current.icon}</div>
                <div className="flex items-center justify-center gap-2">
                  <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-1">{current.title}</h2>
                  {current.optional && (
                    <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-4">Optional</span>
                  )}
                </div>
                <p className="mx-auto mt-1.5 max-w-sm text-xs text-ink-2">
                  {current.key === "basics" && isMulti
                    ? "Who's going and what you love — we'll tailor each stop next."
                    : current.subtitle}
                </p>
              </div>

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
                  plan={plan}
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
            <button
              onClick={changeDestination}
              className="focus-ring-emerald ml-auto inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm transition-colors hover:bg-surface-2"
            >
              <span aria-hidden="true">＋</span> Plan another
            </button>
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
