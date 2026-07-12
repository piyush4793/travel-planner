import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import type { Country } from "@/core/types";
import type { BudgetBasis } from "@/core/utils/budget";
import { buildTripSnapshot, type SavedTrip, type SnapshotStop } from "@/core/utils/savedTrips";
import type { TripPlan } from "@/core/utils/tripPlans";
import type { TripScope } from "@/core/trip/destinationSource";
import type { UnitPlan } from "@/hooks/useTripPlanner";
import { loadLS, saveLS } from "@/core/storage";
import { LS_KEYS } from "@/core/lsKeys";

// Grace window after the first Review auto-save during which async plan hydration
// (lazy rules, auto-city / recommended-day settling) is absorbed silently — so a
// page refresh never shows a "saved" toast without the traveller changing anything.
const SAVE_SETTLE_MS = 2500;

type Params = {
  /** Persist the composed trip (single or multi) as a self-contained snapshot. */
  onSaveTrip?: (snapshot: Omit<SavedTrip, "id" | "favorite">) => void;
  /** True while the wizard is on the Review step. */
  onReviewStep: boolean;
  /** The primary stop's live plan (null until rules load). */
  plan: TripPlan | null;
  /** The active/primary destination. */
  displayCountry: Country | null;
  /** The ordered trip selection (first entry = primary). */
  selection: Country[];
  /** The additional stops' curated funnels. */
  unitPlans: UnitPlan[];
  /** The folded plan across every stop (primary plan when single-stop). */
  composedTripPlan: TripPlan | null | undefined;
  budgetBasis: BudgetBasis;
  /** The active trip scope (world countries vs India states) — saved on the snapshot. */
  scope: TripScope;
  /** The primary stop's tuned day count. */
  primaryCustomDays: number;
  /** The primary stop's experience focus. */
  primaryExperiences: string[];
  /** Shared with usePlanTripRestore: true while a reopened trip is settling. */
  reopenedRef: MutableRefObject<boolean>;
};

export type PlanAutoSave = {
  /** First-ever-Review celebration reveal. */
  showReveal: boolean;
  closeReveal: () => void;
  revealSeconds: number | undefined;
  /** Transient "saved to My Trips" toast (only after a genuine edit). */
  showSavedToast: boolean;
  dismissSavedToast: () => void;
};

/**
 * Auto-saves the composed trip (single or multi) as a self-contained snapshot the
 * moment the traveller reaches Review, and keeps it fresh as they tune the plan.
 * A content signature guards against re-writing on identical renders; the store
 * upserts by route name so edits update the same trip in place. Distinguishes a
 * genuine edit (toast) from mere arrival / async hydration / resume (silent), and
 * celebrates the first-ever Review once. Extracted from PlanView for testability.
 */
export function usePlanAutoSave({
  onSaveTrip,
  onReviewStep,
  plan,
  displayCountry,
  selection,
  unitPlans,
  composedTripPlan,
  budgetBasis,
  scope,
  primaryCustomDays,
  primaryExperiences,
  reopenedRef,
}: Params): PlanAutoSave {
  const savedTripSig = useRef<string | null>(null);
  // The plan hydrates asynchronously (lazy rule JSON, auto-city + recommended-day
  // materialisation), so after the first silent save the signature settles a few
  // times on its own. We absorb those within a short grace window after the first
  // save so a page refresh never pops a "saved" toast; only a change after the
  // plan has settled (or an explicit budget-basis switch) is treated as an edit.
  const firstSaveAtRef = useRef<number | null>(null);
  const prevBasisRef = useRef(budgetBasis);

  // First-time engagement. The reveal celebrates the first-ever Review once (a
  // persisted seen-flag guards repeats, and reopened saved trips skip it — they
  // were already celebrated). The saved toast quietly confirms the auto-save the
  // first time it writes each mount, replacing the old always-on header tick.
  const planStartRef = useRef<number>(Date.now());
  const revealSeenRef = useRef<boolean>(loadLS<boolean>(LS_KEYS.PLAN_REVEAL_SEEN, false));
  const revealShownRef = useRef(false);
  const toastTimerRef = useRef<number | null>(null);
  const reopenSettleTimerRef = useRef<number | null>(null);
  const [showReveal, setShowReveal] = useState(false);
  const [revealSeconds, setRevealSeconds] = useState<number | undefined>(undefined);
  const [showSavedToast, setShowSavedToast] = useState(false);
  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (reopenSettleTimerRef.current) clearTimeout(reopenSettleTimerRef.current);
  }, []);
  const dismissSavedToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = null;
    setShowSavedToast(false);
  }, []);
  const closeReveal = useCallback(() => setShowReveal(false), []);

  useEffect(() => {
    if (!onSaveTrip || !onReviewStep || !plan || !displayCountry || selection.length === 0) return;
    // Build stops from the ordered selection so the saved route's identity always
    // matches what the traveller picked, attaching each stop's own loaded plan
    // where the destination has itinerary data (primary always does).
    const planByName = new Map(unitPlans.map((u) => [u.name, u]));
    const stops: SnapshotStop[] = selection.map((c, i) => {
      if (i === 0) return { country: displayCountry.name, days: primaryCustomDays, plan, experiences: primaryExperiences };
      const u = planByName.get(c.name);
      return u ? { country: u.name, days: u.customDays, plan: u.plan, experiences: u.experiences } : { country: c.name, days: 0 };
    });
    const snapshot = buildTripSnapshot({ stops, composed: composedTripPlan ?? plan, basis: budgetBasis, scope });
    const sig = JSON.stringify(snapshot.stops) + snapshot.totalDays + snapshot.costPerPerson + snapshot.basis + snapshot.scope;
    // Signature guard: identical content (e.g. a spurious re-render) is a no-op —
    // never re-saves, never re-toasts.
    const prevSig = savedTripSig.current;
    if (prevSig === sig) return;
    savedTripSig.current = sig;
    onSaveTrip(snapshot);

    const basisChanged = prevBasisRef.current !== budgetBasis;
    prevBasisRef.current = budgetBasis;

    // A reopened/restored trip settles asynchronously — the basis restore plus
    // (multi-stop) rule hydration re-materialise the plan over several frames.
    // None of that is a user edit, so stay silent and keep re-arming a short
    // timer; only once the plan stops changing does reopen mode clear, after
    // which genuine edits toast normally. This makes "resume" never pop a
    // "saved" toast, regardless of how long hydration takes.
    if (reopenedRef.current) {
      if (prevSig === null) firstSaveAtRef.current = Date.now();
      if (reopenSettleTimerRef.current) clearTimeout(reopenSettleTimerRef.current);
      reopenSettleTimerRef.current = window.setTimeout(() => {
        reopenedRef.current = false;
        reopenSettleTimerRef.current = null;
      }, SAVE_SETTLE_MS);
      return;
    }

    // First save of this mount: record the settle baseline, celebrate the
    // first-ever Review once, and stay silent — merely arriving or refreshing
    // never pops a toast.
    if (prevSig === null) {
      firstSaveAtRef.current = Date.now();
      if (!revealSeenRef.current && !revealShownRef.current) {
        revealShownRef.current = true;
        revealSeenRef.current = true;
        saveLS(LS_KEYS.PLAN_REVEAL_SEEN, true);
        setRevealSeconds(Math.round((Date.now() - planStartRef.current) / 1000));
        setShowReveal(true);
      }
      return;
    }

    // Subsequent saves: the content changed. Absorb async hydration that settles
    // shortly after the first save (a page refresh restores at Review and the plan
    // re-materialises over a few frames) — only a change once settled, or an
    // explicit budget-basis switch (never a hydration side-effect), is a real edit.
    const settling = firstSaveAtRef.current !== null && Date.now() - firstSaveAtRef.current < SAVE_SETTLE_MS;
    if (basisChanged || !settling) {
      setShowSavedToast(true);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => setShowSavedToast(false), 4000);
    }
  }, [onSaveTrip, onReviewStep, plan, displayCountry, selection, unitPlans, composedTripPlan, budgetBasis, scope, primaryCustomDays, primaryExperiences, reopenedRef]);

  return { showReveal, closeReveal, revealSeconds, showSavedToast, dismissSavedToast };
}
