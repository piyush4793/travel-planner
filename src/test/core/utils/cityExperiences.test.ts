import { describe, it, expect } from "vitest";
import {
  experienceTokens,
  tokenHits,
  ruleCityText,
  matchCityExperiences,
} from "@/core/utils/cityExperiences.ts";
import type { CityRule } from "@/core/data/itineraryRules.ts";

describe("cityExperiences", () => {
  it("tokenises experience labels to singularised ≥4-char keywords", () => {
    expect(experienceTokens(["Street Food"]).sort()).toEqual(["food", "street"]);
    expect(experienceTokens(["Temples"])).toEqual(["temple"]);
    // Short words (<4 chars) are dropped.
    expect(experienceTokens(["Ski Fun"])).toEqual([]);
  });

  it("counts how many tokens appear in text", () => {
    expect(tokenHits("street food market", ["street", "food"])).toBe(2);
    expect(tokenHits("mountain hike", ["street", "food"])).toBe(0);
    expect(tokenHits("anything", [])).toBe(0);
  });

  it("flattens a city rule into searchable text", () => {
    const city: CityRule = {
      name: "Foodville",
      minDays: 1,
      recDays: 1,
      maxDays: 2,
      note: "famous market",
      days: [{ theme: "Street Food", activities: [{ name: "Ramen Tour" }] }],
    };
    const text = ruleCityText(city);
    expect(text).toContain("Foodville");
    expect(text).toContain("famous market");
    expect(text).toContain("Street Food");
    expect(text).toContain("Ramen Tour");
  });

  it("returns the country experiences a text satisfies", () => {
    const candidates = ["Street Food", "Temples", "Hiking"];
    expect(matchCityExperiences("a street food tour and a temple visit", candidates)).toEqual([
      "Street Food",
      "Temples",
    ]);
    expect(matchCityExperiences("just a quiet beach", candidates)).toEqual([]);
  });
});
