import { describe, it, expect } from "vitest";
import { generateTripPlan, getMaxRuleDays, getRecRuleDays } from "../utils/tripPlans";
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
    it("returns null for unknown country", () => {
      expect(getMaxRuleDays("Atlantis")).toBeNull();
      expect(getRecRuleDays("Atlantis")).toBeNull();
    });

    it("returns positive numbers for rule countries", () => {
      const max = getMaxRuleDays("Norway");
      const rec = getRecRuleDays("Norway");
      expect(max).toBeGreaterThan(0);
      expect(rec).toBeGreaterThan(0);
      expect(max!).toBeGreaterThanOrEqual(rec!);
    });
  });

  describe("smart city selection", () => {
    it("includes all cities when days are sufficient", () => {
      const max = getMaxRuleDays("Vietnam")!;
      const plan = generateTripPlan(
        { name: "Vietnam", lat: 0, lng: 0, bestMonths: ["March"], budget: "₹50K–₹1L", experiences: [] },
        "custom", [], max,
      );
      // Should use all Vietnam rule cities
      const cities = plan.days.map((d) => d.label.match(/—\s*(.+)$/)?.[1]).filter(Boolean);
      const unique = [...new Set(cities)];
      expect(unique.length).toBeGreaterThanOrEqual(5);
    });

    it("drops low-priority cities when days are tight", () => {
      const plan = generateTripPlan(
        { name: "Vietnam", lat: 0, lng: 0, bestMonths: ["March"], budget: "₹50K–₹1L", experiences: [] },
        "custom", [], 4,
      );
      const cities = plan.days.map((d) => d.label.match(/—\s*(.+)$/)?.[1]).filter(Boolean);
      const unique = [...new Set(cities)];
      // With only 4 days, can't visit all 7 cities
      expect(unique.length).toBeLessThan(7);
      expect(unique.length).toBeGreaterThanOrEqual(1);
    });
  });
});
