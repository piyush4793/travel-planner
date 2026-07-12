import { describe, it, expect } from "vitest";
import type { Country } from "@/core/types.ts";
import { deriveStop, orderCitiesByExperience, projectStopCities, stopPlan } from "@/core/utils/stopPlan.ts";

// Rule-less country → the engine runs the deterministic generic path (no async).
const COUNTRY: Country = {
  name: "Testland (no rule)",
  lat: 0,
  lng: 0,
  bestMonths: ["June", "July"],
  budget: "₹1L",
  experiences: ["Beaches", "Mountains", "Food"],
  travelStyle: ["explorer"],
  cities: [
    { name: "Alpha", lat: 1, lng: 1, experiences: ["Food"] },
    { name: "Beta", lat: 2, lng: 2, experiences: ["Beaches"] },
    { name: "Gamma", lat: 3, lng: 3, experiences: ["Mountains"] },
  ],
};

const base = { country: COUNTRY, rule: null, selectedCities: [], days: 7, experiences: [], basis: "couple" as const };

describe("orderCitiesByExperience", () => {
  it("returns the input order when no experiences are focused", () => {
    expect(orderCitiesByExperience(COUNTRY.cities!, []).map((c) => c.name)).toEqual(["Alpha", "Beta", "Gamma"]);
  });

  it("surfaces experience-matching cities first (stable otherwise)", () => {
    expect(orderCitiesByExperience(COUNTRY.cities!, ["Beaches"]).map((c) => c.name)).toEqual([
      "Beta",
      "Alpha",
      "Gamma",
    ]);
  });
});

describe("deriveStop", () => {
  it("derives an ordered-cities/plan/planCities/autoSelectedCities bundle", () => {
    const d = deriveStop(base);
    expect(d.plan.days.length).toBeGreaterThan(0);
    expect(d.orderedCities.map((c) => c.name)).toEqual(["Alpha", "Beta", "Gamma"]);
    expect(Array.isArray(d.planCities)).toBe(true);
  });

  it("orders cities by focus and pre-picks auto cities in auto mode", () => {
    const d = deriveStop({ ...base, experiences: ["Mountains"] });
    expect(d.orderedCities[0].name).toBe("Gamma");
    // Auto mode (no hand-picks) → autoSelectedCities are drawn from the plan route.
    expect(d.autoSelectedCities.every((n) => d.planCities.includes(n))).toBe(true);
  });

  it("returns no auto-picked cities once the user hand-picks", () => {
    const d = deriveStop({ ...base, selectedCities: ["Alpha"] });
    expect(d.autoSelectedCities).toEqual([]);
  });
});

describe("projectStopCities / stopPlan", () => {
  it("projects the cities a candidate length would visit without committing", () => {
    const cities = projectStopCities({ ...base, days: 3 });
    expect(Array.isArray(cities)).toBe(true);
  });

  it("stopPlan generates a plan matching deriveStop's plan", () => {
    expect(stopPlan(base).days.length).toBe(deriveStop(base).plan.days.length);
  });
});
