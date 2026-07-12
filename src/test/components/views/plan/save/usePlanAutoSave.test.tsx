import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { Country } from "@/core/types";
import type { TripPlan } from "@/core/utils/tripPlans";
import type { BudgetBasis } from "@/core/utils/budget";
import { usePlanAutoSave } from "@/components/views/plan/save/usePlanAutoSave";

function mkCountry(name: string): Country {
  return { name, lat: 0, lng: 0, bestMonths: [], budget: "₹1L", experiences: [] };
}

// Fresh plan each call so passing it as a dep re-runs the effect (identity change)
// while the derived save signature stays content-stable.
function mkPlan(days = 2): TripPlan {
  return {
    duration: `${days} days`,
    costPerPerson: "₹1L",
    note: "",
    costBasis: "couple",
    days: Array.from({ length: days }, (_, i) => ({ label: `Day ${i + 1} — Tokyo`, activities: ["a"] })),
  };
}

const JP = mkCountry("Japan");

function baseParams(overrides: Partial<Parameters<typeof usePlanAutoSave>[0]> = {}) {
  return {
    onSaveTrip: vi.fn(),
    onReviewStep: true,
    plan: mkPlan(),
    displayCountry: JP,
    selection: [JP],
    unitPlans: [],
    composedTripPlan: mkPlan(),
    budgetBasis: "couple" as BudgetBasis,
    primaryCustomDays: 2,
    primaryExperiences: ["Food"],
    reopenedRef: { current: false },
    ...overrides,
  };
}

describe("usePlanAutoSave", () => {
  beforeEach(() => localStorage.clear());

  it("does not save away from the Review step", () => {
    const params = baseParams({ onReviewStep: false });
    renderHook((p) => usePlanAutoSave(p), { initialProps: params });
    expect(params.onSaveTrip).not.toHaveBeenCalled();
  });

  it("auto-saves once on the first Review, silently, and celebrates first-run", () => {
    const onSaveTrip = vi.fn();
    const params = baseParams({ onSaveTrip });
    const { result } = renderHook((p) => usePlanAutoSave(p), { initialProps: params });

    expect(onSaveTrip).toHaveBeenCalledTimes(1);
    expect(onSaveTrip.mock.calls[0][0]).toMatchObject({ name: "Japan", basis: "couple" });
    expect(result.current.showSavedToast).toBe(false); // arrival never toasts
    expect(result.current.showReveal).toBe(true); // first-ever Review celebrated
    expect(typeof result.current.revealSeconds).toBe("number");
  });

  it("does not re-save identical content (signature guard)", () => {
    const params = baseParams();
    const { rerender } = renderHook((p) => usePlanAutoSave(p), { initialProps: params });
    expect(params.onSaveTrip).toHaveBeenCalledTimes(1);

    // Fresh-but-equal plan forces the effect to re-run; the guard suppresses it.
    rerender({ ...params, plan: mkPlan(), composedTripPlan: mkPlan() });
    expect(params.onSaveTrip).toHaveBeenCalledTimes(1);
  });

  it("toasts on a genuine edit (budget-basis switch)", () => {
    localStorage.setItem("tp_plan_reveal_seen", "true"); // skip the reveal
    const params = baseParams();
    const { result, rerender } = renderHook((p) => usePlanAutoSave(p), { initialProps: params });
    expect(params.onSaveTrip).toHaveBeenCalledTimes(1);

    rerender({ ...params, budgetBasis: "solo" });
    expect(params.onSaveTrip).toHaveBeenCalledTimes(2);
    expect(result.current.showSavedToast).toBe(true);
  });

  it("stays silent while a reopened trip is settling", () => {
    const params = baseParams({ reopenedRef: { current: true } });
    const { result, rerender } = renderHook((p) => usePlanAutoSave(p), { initialProps: params });
    expect(params.onSaveTrip).toHaveBeenCalledTimes(1);
    expect(result.current.showSavedToast).toBe(false);
    expect(result.current.showReveal).toBe(false); // reopened trips aren't re-celebrated

    // A content change during the reopen settle window still doesn't toast.
    rerender({ ...params, budgetBasis: "solo" });
    expect(params.onSaveTrip).toHaveBeenCalledTimes(2);
    expect(result.current.showSavedToast).toBe(false);
  });
});
