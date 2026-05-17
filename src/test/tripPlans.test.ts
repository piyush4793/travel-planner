import { describe, it, expect } from "vitest";
import { generateTripPlan } from "../utils/tripPlans";
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
    it("generates a plan with correct duration for touch-and-go", () => {
      const plan = generateTripPlan(COUNTRY_WITH_CITIES, "touch-and-go", [], 0);
      expect(plan).not.toBeNull();
      expect(plan!.duration).toContain("day");
      expect(plan!.days.length).toBeGreaterThan(0);
      expect(plan!.costPerPerson).toContain("₹");
    });

    it("generates a plan for explorer style", () => {
      const plan = generateTripPlan(COUNTRY_WITH_CITIES, "explorer", [], 0);
      expect(plan).not.toBeNull();
      expect(plan!.days.length).toBeGreaterThanOrEqual(3);
    });

    it("generates a plan for month-long style", () => {
      const plan = generateTripPlan(COUNTRY_WITH_CITIES, "month-long", [], 0);
      expect(plan).not.toBeNull();
      expect(plan!.duration).toContain("30");
    });

    it("generates a custom plan with specified days", () => {
      const plan = generateTripPlan(COUNTRY_WITH_CITIES, "custom", [], 5);
      expect(plan).not.toBeNull();
      expect(plan!.duration).toContain("5");
    });

    it("uses selected cities when provided", () => {
      const plan = generateTripPlan(COUNTRY_WITH_CITIES, "explorer", ["CityA", "CityB"], 0);
      expect(plan).not.toBeNull();
      const labels = plan!.days.map((d) => d.label).join(" ");
      expect(labels).toContain("CityA");
      expect(labels).toContain("CityB");
      expect(labels).not.toContain("CityC");
    });

    it("handles country with no cities", () => {
      const plan = generateTripPlan(COUNTRY_NO_CITIES, "explorer", [], 0);
      expect(plan).not.toBeNull();
      expect(plan!.days.length).toBeGreaterThan(0);
    });

    it("day labels follow 'Day N — CityName' format for city plans", () => {
      const plan = generateTripPlan(COUNTRY_WITH_CITIES, "touch-and-go", ["CityA"], 0);
      expect(plan).not.toBeNull();
      plan!.days.forEach((day) => {
        expect(day.label).toMatch(/Day \d+/);
      });
    });

    it("each day has at least one activity", () => {
      const plan = generateTripPlan(COUNTRY_WITH_CITIES, "explorer", [], 0);
      expect(plan).not.toBeNull();
      plan!.days.forEach((day) => {
        expect(day.activities.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("includes cost per person in the plan", () => {
      const plan = generateTripPlan(COUNTRY_WITH_CITIES, "explorer", [], 0);
      expect(plan).not.toBeNull();
      expect(plan!.costPerPerson).toMatch(/₹/);
    });

    it("includes a note in the plan", () => {
      const plan = generateTripPlan(COUNTRY_WITH_CITIES, "explorer", [], 0);
      expect(plan).not.toBeNull();
      expect(plan!.note).toBeTruthy();
    });
  });
});
