import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { normalizeDestinationKey, useAiPlanStore } from "../core/hooks/useAiPlanStore";
import type { LLMTripPlanResult } from "../core/utils/ai/llmTransform";

function makePlan(dest = "Norway"): LLMTripPlanResult {
  return {
    destinationName: dest,
    originCountry: "India",
    travelers: 2,
    durationDays: 7,
    budgetLevel: "mid-range",
    assumptions: [],
    cities: [{ name: "Oslo", lat: 59.91, lng: 10.75, nights: 2 }],
    meta: { bestMonths: [], worstMonths: [], thingsToAvoid: [], comboCountries: [], highlights: [] },
    plan: { duration: "7 days", costPerPerson: "₹1.2L", note: "n/a", days: [] },
  };
}

describe("normalizeDestinationKey — P0", () => {
  it("lowercases and trims", () => {
    expect(normalizeDestinationKey("  Norway ")).toBe("norway");
  });

  it("collapses multiple spaces", () => {
    expect(normalizeDestinationKey("New   Zealand")).toBe("new zealand");
  });

  it("handles already-normalized input", () => {
    expect(normalizeDestinationKey("japan")).toBe("japan");
  });

  it("handles mixed case with spaces", () => {
    expect(normalizeDestinationKey("  Sri  Lanka  ")).toBe("sri lanka");
  });
});

describe("useAiPlanStore — P1", () => {
  it("starts empty when no localStorage data", () => {
    const { result } = renderHook(() => useAiPlanStore());
    expect(result.current.getPlans("Norway")).toEqual([]);
    expect(result.current.getAllDestinations()).toEqual([]);
  });

  it("savePlan persists a plan and returns it", () => {
    const { result } = renderHook(() => useAiPlanStore());

    act(() => { result.current.savePlan(makePlan()); });

    const plans = result.current.getPlans("Norway");
    expect(plans).toHaveLength(1);
    expect(plans[0].destinationName).toBe("Norway");
    expect(plans[0].schemaVersion).toBe(1);
    expect(plans[0].id).toBeTruthy();
    expect(plans[0].savedAt).toBeTruthy();
  });

  it("savePlan caps at 4 plans per destination", () => {
    const { result } = renderHook(() => useAiPlanStore());

    act(() => {
      for (let i = 0; i < 5; i++) {
        result.current.savePlan(makePlan());
      }
    });

    expect(result.current.getPlans("Norway")).toHaveLength(3);
  });

  it("canAddNew returns false at max capacity", () => {
    const { result } = renderHook(() => useAiPlanStore());

    act(() => {
      for (let i = 0; i < 3; i++) {
        result.current.savePlan(makePlan());
      }
    });

    expect(result.current.canAddNew("Norway")).toBe(false);
  });

  it("canAddNew returns true when under capacity", () => {
    const { result } = renderHook(() => useAiPlanStore());

    act(() => { result.current.savePlan(makePlan()); });

    expect(result.current.canAddNew("Norway")).toBe(true);
  });

  it("replacePlan swaps the matching plan", () => {
    const { result } = renderHook(() => useAiPlanStore());

    let firstId: string;
    act(() => {
      const saved = result.current.savePlan(makePlan());
      firstId = saved.id;
    });

    const luxuryPlan = makePlan();
    luxuryPlan.budgetLevel = "luxury";
    luxuryPlan.durationDays = 14;

    act(() => { result.current.replacePlan(firstId!, luxuryPlan); });

    const plans = result.current.getPlans("Norway");
    expect(plans).toHaveLength(1);
    expect(plans[0].result.budgetLevel).toBe("luxury");
    expect(plans[0].id).not.toBe(firstId!);
  });

  it("deletePlan removes the plan and cleans up empty buckets", () => {
    const { result } = renderHook(() => useAiPlanStore());

    let planId: string;
    act(() => {
      const saved = result.current.savePlan(makePlan());
      planId = saved.id;
    });

    act(() => { result.current.deletePlan("Norway", planId!); });

    expect(result.current.getPlans("Norway")).toEqual([]);
    expect(result.current.getAllDestinations()).toEqual([]);
  });

  it("getAllDestinations only lists non-empty destinations", () => {
    const { result } = renderHook(() => useAiPlanStore());

    act(() => {
      result.current.savePlan(makePlan("Norway"));
      result.current.savePlan(makePlan("Japan"));
    });

    const dests = result.current.getAllDestinations();
    expect(dests).toContain("norway");
    expect(dests).toContain("japan");
    expect(dests).toHaveLength(2);
  });

  it("getPlans is case-insensitive via key normalization", () => {
    const { result } = renderHook(() => useAiPlanStore());

    act(() => { result.current.savePlan(makePlan("Norway")); });

    expect(result.current.getPlans("norway")).toHaveLength(1);
    expect(result.current.getPlans("NORWAY")).toHaveLength(1);
    expect(result.current.getPlans("  Norway  ")).toHaveLength(1);
  });

  it("persists to localStorage and survives re-render", () => {
    const { result, rerender } = renderHook(() => useAiPlanStore());

    act(() => { result.current.savePlan(makePlan()); });

    rerender();
    expect(result.current.getPlans("Norway")).toHaveLength(1);
  });

  it("handles malformed localStorage gracefully", () => {
    localStorage.setItem("tp_ai_plans", '{"norway": "not-an-array", "japan": [{"bad": true}]}');

    const { result } = renderHook(() => useAiPlanStore());
    expect(result.current.getPlans("Norway")).toEqual([]);
    expect(result.current.getPlans("Japan")).toEqual([]);
  });

  it("maxPlans constant is 4", () => {
    const { result } = renderHook(() => useAiPlanStore());
    expect(result.current.maxPlans).toBe(3);
  });
});
