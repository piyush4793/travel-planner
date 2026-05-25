import { describe, it, expect } from "vitest";
import { generateTripPlan, getMaxRuleDays, getRecRuleDays, extractCityFromLabel, extractPlanCities, isRealCity, normalizeCityName } from "../utils/tripPlans";
import type { Country } from "../types";

const COUNTRY_WITH_CITIES: Country = {
  name: "TestLand",
  lat: 0,
  lng: 0,
  bestMonths: ["March", "April"],
  budget: "₹1L–₹2L",
  experiences: ["Temples", "Food", "Hiking"],
  cities: [
    { name: "CityA", lat: 10, lng: 20, bestMonths: ["March"], notes: "Old town, river walk" },
    { name: "CityB", lat: 11, lng: 21, bestMonths: ["April"], notes: "Beach, nightlife" },
    { name: "CityC", lat: 12, lng: 22 },
  ],
};

const COUNTRY_NO_CITIES: Country = {
  name: "Simple",
  lat: 0,
  lng: 0,
  bestMonths: ["January"],
  budget: "₹50K–₹1L",
  experiences: ["Adventure"],
};

describe("tripPlans — P0", () => {
  describe("generateTripPlan", () => {
    it("generates a short trip plan", () => {
      const plan = generateTripPlan(COUNTRY_WITH_CITIES, "custom", [], 3);
      expect(plan.duration).toContain("3");
      expect(plan.days.length).toBeGreaterThan(0);
      expect(plan.costPerPerson).toContain("₹");
    });

    it("generates a week-long plan", () => {
      const plan = generateTripPlan(COUNTRY_WITH_CITIES, "custom", [], 7);
      expect(plan.days.length).toBeGreaterThanOrEqual(1);
      expect(plan.duration).toContain("7");
    });

    it("generates a month-long plan", () => {
      const plan = generateTripPlan(COUNTRY_WITH_CITIES, "custom", [], 30);
      expect(plan.duration).toContain("30");
    });

    it("generates a custom plan with specified days", () => {
      const plan = generateTripPlan(COUNTRY_WITH_CITIES, "custom", [], 5);
      expect(plan.duration).toContain("5");
    });

    it("uses selected cities when provided", () => {
      const plan = generateTripPlan(COUNTRY_WITH_CITIES, "custom", ["CityA", "CityB"], 7);
      const labels = plan.days.map((d) => d.label).join(" ");
      expect(labels).toContain("CityA");
      expect(labels).toContain("CityB");
      expect(labels).not.toContain("CityC");
    });

    it("handles country with no cities", () => {
      const plan = generateTripPlan(COUNTRY_NO_CITIES, "custom", [], 7);
      expect(plan.days.length).toBeGreaterThan(0);
    });

    it("day labels follow 'Day N' format", () => {
      const plan = generateTripPlan(COUNTRY_WITH_CITIES, "custom", ["CityA"], 3);
      plan.days.forEach((day) => {
        expect(day.label).toMatch(/Day \d+/);
      });
    });

    it("each day has at least one activity", () => {
      const plan = generateTripPlan(COUNTRY_WITH_CITIES, "custom", [], 7);
      plan.days.forEach((day) => {
        expect(day.activities.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("includes cost per person in the plan", () => {
      const plan = generateTripPlan(COUNTRY_WITH_CITIES, "custom", [], 7);
      expect(plan.costPerPerson).toMatch(/₹/);
    });

    it("includes a note in the plan", () => {
      const plan = generateTripPlan(COUNTRY_WITH_CITIES, "custom", [], 7);
      expect(plan.note).toBeTruthy();
    });
  });

  describe("getMaxRuleDays / getRecRuleDays", () => {
    it("returns null for null rule", () => {
      expect(getMaxRuleDays(null)).toBeNull();
      expect(getRecRuleDays(null)).toBeNull();
      expect(getMaxRuleDays(undefined)).toBeNull();
      expect(getRecRuleDays(undefined)).toBeNull();
    });

    it("returns positive numbers for valid rule", () => {
      const mockRule = {
        cityOrder: ["CityA", "CityB"],
        cities: {
          CityA: { name: "CityA", minDays: 2, recDays: 3, maxDays: 4, days: [] },
          CityB: { name: "CityB", minDays: 1, recDays: 2, maxDays: 3, days: [] },
        },
        connections: [],
      };
      const max = getMaxRuleDays(mockRule);
      const rec = getRecRuleDays(mockRule);
      expect(max).toBe(7);
      expect(rec).toBe(5);
    });
  });

  describe("smart city selection", () => {
    it("generates plan without rule (generic fallback)", () => {
      const plan = generateTripPlan(
        { name: "TestLand", lat: 0, lng: 0, bestMonths: ["March"], budget: "₹50K–₹1L", experiences: ["Temples", "Food"] },
        "custom", [], 7,
      );
      expect(plan.days.length).toBeGreaterThanOrEqual(1);
      expect(plan.costPerPerson).toBeTruthy();
      expect(plan.duration).toContain("7");
    });

    it("uses generic algorithm when no rule provided", () => {
      const plan = generateTripPlan(
        { name: "Unknown", lat: 0, lng: 0, bestMonths: ["March"], budget: "₹50K–₹1L", experiences: [] },
        "custom", [], 4,
      );
      expect(plan.days.length).toBeGreaterThanOrEqual(1);
      expect(plan.duration).toContain("4");
    });
  });

  describe("extractCityFromLabel", () => {
    it("extracts city from em-dash label", () => {
      expect(extractCityFromLabel("Day 1 — Oslo")).toBe("Oslo");
    });
    it("extracts city from en-dash label", () => {
      expect(extractCityFromLabel("Day 3 – Bergen")).toBe("Bergen");
    });
    it("extracts city from hyphen label", () => {
      expect(extractCityFromLabel("Day 2 - Hanoi")).toBe("Hanoi");
    });
    it("returns empty for label without city", () => {
      expect(extractCityFromLabel("Day 5")).toBe("");
    });
  });

  describe("extractPlanCities", () => {
    it("extracts unique ordered cities", () => {
      const days = [
        { label: "Day 1 — Oslo", activities: [] },
        { label: "Day 2 — Oslo", activities: [] },
        { label: "Day 3 — Bergen", activities: [] },
        { label: "Day 4 — Flam", activities: [] },
      ];
      expect(extractPlanCities(days)).toEqual(["Oslo", "Bergen", "Flam"]);
    });
    it("returns empty for no city labels", () => {
      expect(extractPlanCities([{ label: "Day 1", activities: [] }])).toEqual([]);
    });
  });

  describe("isRealCity", () => {
    it("accepts normal city names", () => {
      expect(isRealCity("Oslo")).toBe(true);
      expect(isRealCity("Ho Chi Minh City")).toBe(true);
    });
    it("rejects noise entries", () => {
      expect(isRealCity("Stay: Bergen")).toBe(false);
      expect(isRealCity("RETURN")).toBe(false);
      expect(isRealCity("Entry costs:")).toBe(false);
      expect(isRealCity("Recommended hotels:")).toBe(false);
      expect(isRealCity("Mostly free")).toBe(false);
    });
  });

  describe("normalizeCityName", () => {
    it("lowercases and trims", () => {
      expect(normalizeCityName("OSLO")).toBe("oslo");
      expect(normalizeCityName("  Bergen  ")).toBe("bergen");
    });
    it("strips Stay: prefix", () => {
      expect(normalizeCityName("Stay: Flåm")).toBe("flåm");
    });
  });
});
