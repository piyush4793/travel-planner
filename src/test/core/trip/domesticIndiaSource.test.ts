import { describe, it, expect } from "vitest";
import { domesticIndiaSource } from "@/core/trip/domesticIndiaSource.ts";
import { generateTripPlan, extractPlanCities } from "@/core/utils/tripPlans.ts";

describe("domesticIndiaSource", () => {
  it("exposes the domestic scope with state unit nouns", () => {
    expect(domesticIndiaSource.scope).toBe("domestic");
    expect(domesticIndiaSource.unitNoun).toBe("state");
    expect(domesticIndiaSource.unitNounPlural).toBe("states");
  });

  it("ranks plannable states most-popular first and resolves them", () => {
    const popular = domesticIndiaSource.popular();
    expect(popular.length).toBeGreaterThanOrEqual(20);
    // Rajasthan is the highest-popularity domestic seed.
    expect(popular[0].name).toBe("Rajasthan");
    for (let i = 1; i < popular.length; i++) {
      const prev = popular[i - 1].popularityScore ?? 0;
      const cur = popular[i].popularityScore ?? 0;
      expect(prev).toBeGreaterThanOrEqual(cur);
    }
    expect(domesticIndiaSource.resolveUnit("Rajasthan")?.name).toBe("Rajasthan");
    expect(domesticIndiaSource.resolveUnit("France")).toBeNull();
  });

  it("reports manifest-backed day bounds with rec ≤ max", () => {
    const bounds = domesticIndiaSource.dayBounds("Rajasthan");
    expect(bounds.rec).toBeGreaterThan(0);
    expect(bounds.max).toBeGreaterThanOrEqual(bounds.rec);
  });

  it("suggests 'combine with' states from combo data", () => {
    const combos = domesticIndiaSource.comboRecommendations(["Rajasthan"]);
    expect(combos.every((c) => c.name !== "Rajasthan")).toBe(true);
    // Every suggestion must itself be a plannable domestic state.
    for (const c of combos) expect(domesticIndiaSource.resolveUnit(c.name)).not.toBeNull();
  });

  it("unions selected states' experiences in first-seen order without duplicates", async () => {
    const single = await domesticIndiaSource.experiencesFor(["Rajasthan"]);
    expect(single.length).toBeGreaterThan(0);
    expect(new Set(single).size).toBe(single.length);
    const union = await domesticIndiaSource.experiencesFor(["Rajasthan", "Kerala"]);
    expect(new Set(union).size).toBe(union.length);
    for (const exp of single) expect(union).toContain(exp);
  });

  it("loads a state as a merged country plus rule with cities", async () => {
    const unit = await domesticIndiaSource.loadUnit("Rajasthan");
    expect(unit).not.toBeNull();
    expect(unit!.country.name).toBe("Rajasthan");
    expect(unit!.country.cities?.length ?? 0).toBeGreaterThan(0);
    expect(unit!.rule).not.toBeNull();
  });

  it("returns null when loading a state that isn't plannable", async () => {
    expect(await domesticIndiaSource.loadUnit("Atlantis")).toBeNull();
  });

  it("generates a full offline itinerary for a state, like international does", async () => {
    const unit = await domesticIndiaSource.loadUnit("Rajasthan");
    const rule = unit!.rule!;
    const cities = rule.cityOrder.slice(0, 3);
    const plan = generateTripPlan(unit!.country, cities, domesticIndiaSource.dayBounds("Rajasthan").rec, rule);
    expect(plan.days.length).toBeGreaterThan(0);
    // Every planned-day city must belong to the state's rule.
    const ruleCities = new Set(rule.cityOrder);
    for (const city of extractPlanCities(plan.days)) expect(ruleCities.has(city)).toBe(true);
  });
});
