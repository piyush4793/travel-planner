import { describe, it, expect } from "vitest";
import { summarizePlan, formatPlanLabel } from "../utils/planDiff";
import type { LLMTripPlanResult } from "../utils/ai/llmTransform";

function makePlan(overrides: Partial<LLMTripPlanResult> = {}): LLMTripPlanResult {
  return {
    destinationName: "Norway",
    originCountry: "India",
    travelers: 2,
    durationDays: 7,
    budgetLevel: "mid-range",
    assumptions: [],
    cities: [
      { name: "Oslo", lat: 59.91, lng: 10.75, nights: 2 },
      { name: "Bergen", lat: 60.39, lng: 5.32, nights: 3 },
    ],
    meta: { bestMonths: [], worstMonths: [], thingsToAvoid: [], comboCountries: [], highlights: [] },
    plan: {
      duration: "7 days / 6 nights",
      costPerPerson: "₹1.2L",
      note: "Great trip",
      days: [],
    },
    ...overrides,
  };
}

describe("planDiff — P1", () => {
  describe("summarizePlan", () => {
    it("extracts duration, budget, cities, and cost", () => {
      const s = summarizePlan(makePlan());
      expect(s.duration).toBe("7 days");
      expect(s.budget).toBe("mid-range");
      expect(s.cities).toEqual(["Oslo", "Bergen"]);
      expect(s.cost).toBe("₹1.2L");
    });

    it("handles zero cities", () => {
      const s = summarizePlan(makePlan({ cities: [] }));
      expect(s.cities).toEqual([]);
    });

    it("reflects overridden budget and duration", () => {
      const s = summarizePlan(makePlan({ durationDays: 14, budgetLevel: "luxury" }));
      expect(s.duration).toBe("14 days");
      expect(s.budget).toBe("luxury");
    });
  });

  describe("formatPlanLabel", () => {
    it("formats label without savedAt", () => {
      const label = formatPlanLabel(makePlan());
      expect(label).toBe("7d · mid-range · Oslo, Bergen");
    });

    it("formats label with savedAt", () => {
      const label = formatPlanLabel(makePlan(), "2026-01-15T10:00:00.000Z");
      expect(label).toContain("Saved Jan 15");
      expect(label).toContain("7d · mid-range · Oslo, Bergen");
    });

    it("handles single city", () => {
      const label = formatPlanLabel(makePlan({ cities: [{ name: "Tokyo", lat: 35.68, lng: 139.69, nights: 5 }] }));
      expect(label).toBe("7d · mid-range · Tokyo");
    });

    it("handles empty cities", () => {
      const label = formatPlanLabel(makePlan({ cities: [] }));
      expect(label).toBe("7d · mid-range · ");
    });
  });
});
