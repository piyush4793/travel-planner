import { loadLS, saveLS } from "@/core/storage";
import { LS_KEYS } from "@/core/lsKeys";
import type { TripScope } from "@/core/trip/destinationSource";

/**
 * A resumable snapshot of the guided planner so a page refresh drops the user
 * back where they left off (same destinations, step and selections) instead of
 * restarting the wizard. Purely local convenience state — safe to discard.
 *
 * `countries` is the ordered trip selection (>= 1). The first entry is the
 * active/primary destination; multi-country composition builds on the rest.
 */
export type PlanDraft = {
  countries: string[];
  step: number;
  cities: string[];
  experiences: string[];
  days: number;
  pinned: boolean;
  /** Trip scope the draft was built in, so a refresh resumes the right source. */
  scope: TripScope;
};

/** Pre-multi-country persisted shape (single `country` string). */
type StoredPlanDraft = Partial<PlanDraft> & { country?: string };

export function loadPlanDraft(): PlanDraft | null {
  const raw = loadLS<StoredPlanDraft | null>(LS_KEYS.PLAN_DRAFT, null);
  if (!raw) return null;
  // Normalize the legacy single-country shape to an ordered list so a refresh
  // mid-wizard survives the upgrade. The draft is throwaway convenience state,
  // so we migrate here rather than through the global schema-version runner.
  const countries = raw.countries ?? (raw.country ? [raw.country] : []);
  if (countries.length === 0) return null;
  return {
    countries,
    step: raw.step ?? 0,
    cities: raw.cities ?? [],
    experiences: raw.experiences ?? [],
    days: raw.days ?? 0,
    pinned: raw.pinned ?? false,
    // Drafts saved before scopes existed are international.
    scope: raw.scope === "domestic" ? "domestic" : "international",
  };
}

export function savePlanDraft(draft: PlanDraft): void {
  saveLS(LS_KEYS.PLAN_DRAFT, draft);
}

export function clearPlanDraft(): void {
  saveLS<PlanDraft | null>(LS_KEYS.PLAN_DRAFT, null);
}
