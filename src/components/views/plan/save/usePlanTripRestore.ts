import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { Country } from "@/core/types";
import type { BudgetBasis } from "@/core/utils/budget";
import type { PlanBuilderSeed } from "@/hooks/usePlanBuilder";
import type { TripPlannerSeed } from "@/hooks/useTripPlanner";
import { toOpenRequest, type SavedTrip, type OpenTripRequest } from "@/core/utils/savedTrips";
import type { TripScope } from "@/core/trip/destinationSource";
import { scopeForDestination } from "@/core/trip/getDestinationSource";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import { clearPlanDraft } from "../shell/planDraft";

type StopSeed = { cities: string[]; days: number; experiences: string[] };

type RestoreSeed = {
  nonce: number;
  primary: StopSeed;
  byCountry: Record<string, StopSeed>;
};

type Params = {
  countries: Country[];
  /** Resolve a saved stop's country name to a live Country (My List or catalog). */
  resolveCountry: (name: string) => Country | null;
  /** My Trips "reopen" request; bump its nonce to re-open the same trip. */
  openTrip?: OpenTripRequest | null;
  /** "+ New trip" reset request; bump the nonce to discard the in-progress plan. */
  startNewNonce?: number;
  /** Resolve a saved trip for a picked country set (resume-vs-fresh prompt). */
  matchSavedTrip?: (countries: string[]) => SavedTrip | null;
  /** Record destinations as "recently planned" when they enter the funnel. */
  onRecordPlanned?: (names: string[]) => void;
  setSelection: Dispatch<SetStateAction<Country[]>>;
  setStepIndex: Dispatch<SetStateAction<number>>;
  setBudgetBasis: (b: BudgetBasis) => void;
  /** The active trip scope, so reopen can align it to the saved trip's scope. */
  scope: TripScope;
  /** Switch the active scope (before resolving a reopened trip's stop names). */
  setScope: (s: TripScope) => void;
};

export type PlanTripRestore = {
  /** Per-stop seed for the primary destination (`usePlanBuilder`). */
  primarySeed: PlanBuilderSeed | null;
  /** Per-stop seeds for the additional stops (`useTripPlanner`). */
  tripSeed: TripPlannerSeed | null;
  /** True while a reopened trip's async hydration is still settling; the
   *  auto-save hook consumes and clears this so "resume" never toasts. */
  reopenedRef: MutableRefObject<boolean>;
  /** Landing "Start trip" — resume a matching saved trip or start fresh. */
  handleStartSelection: (chosen: Country[]) => Promise<void>;
  /** Render slot for the resume-vs-fresh confirm dialog. */
  ResumeDialog: () => JSX.Element | null;
};

/**
 * Owns the wizard's open / resume / reset lifecycle: reopening a saved trip
 * (`openTrip` or a same-set "Resume" prompt), discarding the plan on "+ New
 * trip" (`startNewNonce`), and staging the per-stop restore seeds that
 * `usePlanBuilder` (primary) and `useTripPlanner` (additional stops) apply.
 * Extracted from PlanView so the orchestrator stays thin and this pipeline is
 * unit-testable in isolation.
 */
export function usePlanTripRestore({
  countries,
  resolveCountry,
  openTrip,
  startNewNonce,
  matchSavedTrip,
  onRecordPlanned,
  setSelection,
  setStepIndex,
  setBudgetBasis,
  scope,
  setScope,
}: Params): PlanTripRestore {
  // A reopened saved trip's per-stop snapshot (cities + honest length +
  // experience focus), applied once per nonce to rehydrate the funnel: the
  // primary stop through `usePlanBuilder`, the additional stops through
  // `useTripPlanner`.
  const [restoreSeed, setRestoreSeed] = useState<RestoreSeed | null>(null);
  const primarySeed = useMemo<PlanBuilderSeed | null>(
    () => (restoreSeed ? { nonce: restoreSeed.nonce, ...restoreSeed.primary } : null),
    [restoreSeed],
  );
  const tripSeed = useMemo<TripPlannerSeed | null>(
    () => (restoreSeed ? { nonce: restoreSeed.nonce, byCountry: restoreSeed.byCountry } : null),
    [restoreSeed],
  );

  // "+ New trip" from My Trips: discard any in-progress selection + draft and
  // drop back to a fresh landing picker. Nonce-guarded so it fires only on an
  // explicit request, never on the initial mount (the draft resume owns that).
  const startNewNonceRef = useRef(startNewNonce);
  useEffect(() => {
    if (startNewNonce === undefined || startNewNonce === startNewNonceRef.current) return;
    startNewNonceRef.current = startNewNonce;
    setSelection([]);
    setStepIndex(0);
    setRestoreSeed(null);
    clearPlanDraft();
  }, [startNewNonce, setSelection, setStepIndex]);

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
  const reopenedRef = useRef(false);
  useEffect(() => {
    if (!pendingOpen || appliedOpenNonce.current === pendingOpen.nonce) return;
    // Align the scope/source to the saved trip *before* resolving stop names: a
    // domestic route's units only resolve against the domestic manifest. Setting
    // scope re-renders with the right source, then this effect re-runs (scope is
    // in deps) and the names resolve. Idempotent when already aligned. Legacy
    // requests without a scope are international. The saved scope is reconciled
    // against its own destinations so a snapshot corrupted by a prior scope desync
    // (international stops under a domestic scope) still reopens against the store
    // that actually has them.
    const targetScope = scopeForDestination(
      pendingOpen.stops[0]?.country ?? "",
      pendingOpen.scope ?? "international",
    );
    if (targetScope !== scope) {
      setScope(targetScope);
      return;
    }
    const stopByName = new Map(pendingOpen.stops.map((s) => [s.country, s]));
    const resolved = pendingOpen.stops.map((s) => resolveCountry(s.country)).filter((c): c is Country => c !== null);
    // Only mark this open request as handled once the names actually resolve, so
    // an open that arrives before destination data is ready is retried rather than
    // permanently swallowed by a prematurely-stamped nonce.
    if (resolved.length === 0) return;
    appliedOpenNonce.current = pendingOpen.nonce;
    reopenedRef.current = true;
    setSelection(resolved);
    setStepIndex(2);
    setBudgetBasis(pendingOpen.basis);
    // Reopening a saved route is an act of planning it again, so it joins the
    // implicit Recents ledger (same as starting fresh). Nonce-guarded above, so
    // this records once per reopen.
    onRecordPlanned?.(resolved.map((c) => c.name));
    // Align the restore payload to the *resolved* order, so an unresolvable stop
    // never shifts the primary/secondary split.
    const primaryStop = stopByName.get(resolved[0].name);
    const byCountry: Record<string, StopSeed> = {};
    for (const c of resolved.slice(1)) {
      const s = stopByName.get(c.name);
      if (s) byCountry[c.name] = { cities: s.cities, days: s.days, experiences: s.experiences };
    }
    setRestoreSeed({
      nonce: pendingOpen.nonce,
      primary: primaryStop
        ? { cities: primaryStop.cities, days: primaryStop.days, experiences: primaryStop.experiences }
        : { cities: [], days: 7, experiences: [] },
      byCountry,
    });
    // Re-runs when the open request changes or destination data lands, but the
    // nonce guard above makes it idempotent per open, so it applies exactly once
    // and never clobbers in-progress edits. resolveCountry/setBudgetBasis stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingOpen, countries, scope]);

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
    onRecordPlanned?.(chosen.map((c) => c.name));
  }, [matchSavedTrip, confirmResume, onRecordPlanned, setSelection, setStepIndex]);

  return { primarySeed, tripSeed, reopenedRef, handleStartSelection, ResumeDialog };
}
