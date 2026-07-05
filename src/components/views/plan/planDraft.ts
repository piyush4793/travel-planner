import { loadLS, saveLS } from "../../../core/storage";
import { LS_KEYS } from "../../../core/lsKeys";

/**
 * A resumable snapshot of the guided planner so a page refresh drops the user
 * back where they left off (same destination, step and selections) instead of
 * restarting the wizard. Purely local convenience state — safe to discard.
 */
export type PlanDraft = {
  country: string;
  step: number;
  cities: string[];
  experiences: string[];
  days: number;
  pinned: boolean;
};

export function loadPlanDraft(): PlanDraft | null {
  return loadLS<PlanDraft | null>(LS_KEYS.PLAN_DRAFT, null);
}

export function savePlanDraft(draft: PlanDraft): void {
  saveLS(LS_KEYS.PLAN_DRAFT, draft);
}

export function clearPlanDraft(): void {
  saveLS<PlanDraft | null>(LS_KEYS.PLAN_DRAFT, null);
}
