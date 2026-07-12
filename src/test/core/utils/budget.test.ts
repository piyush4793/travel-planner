import { describe, it, expect } from "vitest";
import {
  budgetForBasis,
  isBudgetBasis,
  BUDGET_BASIS_ORDER,
  BUDGET_BASIS_META,
  BASIS_MULTIPLIER,
  DEFAULT_BUDGET_BASIS,
  deriveBudgetBreakdown,
  parseBudgetRange,
} from "@/core/utils/budget.ts";
import type { Country } from "@/core/types.ts";

const base: Country = {
  name: "Testland",
  lat: 0,
  lng: 0,
  region: "Asia",
  budget: "₹2L–₹4L",
  bestMonths: [],
  experiences: [],
} as unknown as Country;

describe("budget module", () => {
  it("returns the per-basis budget when a breakdown exists", () => {
    const c = { ...base, budgetBreakdown: { solo: "₹1L–₹2L", couple: "₹2L–₹4L", family4: "₹4L–₹8L" } };
    expect(budgetForBasis(c, "solo")).toBe("₹1L–₹2L");
    expect(budgetForBasis(c, "couple")).toBe("₹2L–₹4L");
    expect(budgetForBasis(c, "family4")).toBe("₹4L–₹8L");
  });

  it("falls back to the single budget string when no breakdown", () => {
    expect(budgetForBasis(base, "family4")).toBe("₹2L–₹4L");
  });

  it("validates basis values", () => {
    expect(isBudgetBasis("couple")).toBe(true);
    expect(isBudgetBasis("family4")).toBe(true);
    expect(isBudgetBasis("group")).toBe(false);
    expect(isBudgetBasis(null)).toBe(false);
    expect(isBudgetBasis(undefined)).toBe(false);
  });

  it("keeps meta and order aligned", () => {
    expect(DEFAULT_BUDGET_BASIS).toBe("couple");
    expect(BUDGET_BASIS_ORDER).toEqual(["solo", "couple", "family4"]);
    for (const basis of BUDGET_BASIS_ORDER) {
      expect(BUDGET_BASIS_META[basis].icon.length).toBeGreaterThan(0);
      expect(BUDGET_BASIS_META[basis].label.length).toBeGreaterThan(0);
      expect(BUDGET_BASIS_META[basis].long.length).toBeGreaterThan(0);
    }
  });
});

describe("deriveBudgetBreakdown", () => {
  it("returns empty fields for blank input", () => {
    expect(deriveBudgetBreakdown("")).toEqual({ solo: "", couple: "", family4: "" });
    expect(deriveBudgetBreakdown("   ")).toEqual({ solo: "", couple: "", family4: "" });
  });

  it("keeps solo as entered and derives couple/family from calibrated ratios", () => {
    const d = deriveBudgetBreakdown("₹2L–₹4L");
    expect(d.solo).toBe("₹2L–₹4L");
    // couple ≈ 1.77×: 2L→3.5L, 4L→7L (rounded to nearest 0.5L)
    expect(d.couple).toBe("₹3.5L–₹7L");
    // family4 ≈ 3.45×: 2L→7L, 4L→14L (rounded to nearest 0.5L)
    expect(d.family4).toBe("₹7L–₹14L");
  });

  it("preserves ordering solo ≤ couple ≤ family4", () => {
    expect(BASIS_MULTIPLIER.solo).toBeLessThan(BASIS_MULTIPLIER.couple);
    expect(BASIS_MULTIPLIER.couple).toBeLessThan(BASIS_MULTIPLIER.family4);
  });

  it("handles single-value (non-range) budgets", () => {
    const d = deriveBudgetBreakdown("₹1L");
    expect(d.solo).toBe("₹1L");
    expect(d.couple).toBe("₹2L"); // 1.77L → nearest 0.5L = 2L
    expect(d.family4).toBe("₹3.5L"); // 3.45L → nearest 0.5L = 3.5L
  });

  it("leaves unparseable input untouched per part", () => {
    const d = deriveBudgetBreakdown("free");
    expect(d.solo).toBe("free");
    expect(d.couple).toBe("free");
    expect(d.family4).toBe("free");
  });
});

describe("parseBudgetRange", () => {
  it("parses a lo–hi range into ordered rupee bounds", () => {
    expect(parseBudgetRange("₹1.5L–₹3L")).toEqual([150000, 300000]);
    expect(parseBudgetRange("₹50K–₹1L")).toEqual([50000, 100000]);
  });

  it("treats a single value as a zero-width range", () => {
    expect(parseBudgetRange("₹2L")).toEqual([200000, 200000]);
    expect(parseBudgetRange("₹80,000")).toEqual([80000, 80000]);
  });

  it("normalizes reversed bounds to [low, high]", () => {
    expect(parseBudgetRange("₹3L–₹1L")).toEqual([100000, 300000]);
  });

  it("returns null when nothing is parseable", () => {
    expect(parseBudgetRange("free")).toBeNull();
    expect(parseBudgetRange("")).toBeNull();
  });
});
