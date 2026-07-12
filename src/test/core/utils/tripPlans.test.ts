import { describe, it, expect } from "vitest";
import { generateTripPlan, composeTripPlan, shiftDayNumbers, shiftPlanDays, getMaxRuleDays, getRecRuleDays, recommendedDaysForSelection, topExperienceCities, cityExperienceStrength, resolvePlannedCities, extractCityFromLabel, extractPlanCities, isRealCity, normalizeCityName } from "@/core/utils/tripPlans.ts";
import type { TripSegment } from "@/core/utils/tripPlans.ts";
import type { Country } from "@/core/types.ts";

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

// Mirrors a non-seed My List country before enrichment loads (e.g. India on
// first render): no experiences, no budget, no cities. Historically this crashed
// generateTripPlan via act(undefined).toLowerCase().
const EMPTY_COUNTRY: Country = {
  name: "Emptyland",
  lat: 0,
  lng: 0,
  bestMonths: [],
  budget: "",
  experiences: [],
};

function generateNonCustomPlan(style: "touch-and-go" | "explorer" | "immersive") {
  return generateTripPlan(COUNTRY_WITH_CITIES, style as never, [], 7);
}

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

    it("uses the generic fallback entry when no cities are selected and zero days are requested", () => {
      const plan = generateTripPlan(COUNTRY_NO_CITIES, "custom", [], 0);

      expect(plan.days).toHaveLength(1);
      expect(plan.days[0].label).toContain("Your Trip");
    });

    it("adds deeper exploration and final days entries for longer generic custom trips", () => {
      const twoWeeks = generateTripPlan(COUNTRY_NO_CITIES, "custom", [], 14);
      const threeWeeks = generateTripPlan(COUNTRY_NO_CITIES, "custom", [], 21);

      expect(twoWeeks.days.some((day) => day.label.includes("Deeper Exploration"))).toBe(true);
      expect(threeWeeks.days.some((day) => day.label.includes("Final Days"))).toBe(true);
    });

    it("warns when custom city selections are tighter than the available days", () => {
      const plan = generateTripPlan(COUNTRY_WITH_CITIES, "custom", ["CityA", "CityB", "CityC"], 2);

      expect(plan.warning).toContain("tight");
      expect(plan.warning).not.toContain("⚠️");
      expect(plan.duration).toBe("3 days");
    });
  });

  describe("touch-and-go style", () => {
    it("returns 3 day groups with a cost range and stopover note", () => {
      const plan = generateNonCustomPlan("touch-and-go");

      expect(plan.days).toHaveLength(3);
      expect(plan.costPerPerson).toContain("₹");
      expect(plan.costPerPerson).toContain("–");
      expect(plan.note.toLowerCase()).toContain("stopover");
    });
  });

  describe("explorer style", () => {
    it("returns 4 day groups with a 7-12 day duration", () => {
      const plan = generateNonCustomPlan("explorer");

      expect(plan.days).toHaveLength(4);
      expect(plan.duration).toBe("7 – 12 days");
    });

    it("warns when too many cities are packed into explorer mode", () => {
      const plan = generateTripPlan(
        COUNTRY_WITH_CITIES,
        "explorer" as never,
        ["CityA", "CityB", "CityC", "CityD", "CityE", "CityF", "CityG", "CityH", "CityI"],
        10,
      );

      expect(plan.warning).toContain("rushed");
    });
  });

  describe("month-long style", () => {
    it("covers the immersive long-stay branch with 4 day groups and ~30 day duration", () => {
      const plan = generateNonCustomPlan("immersive");

      expect(plan.days).toHaveLength(4);
      expect(plan.duration).toMatch(/30/);
    });

    it("uses city-based month-long planning when specific cities are selected", () => {
      const plan = generateTripPlan(COUNTRY_WITH_CITIES, "immersive" as never, ["CityA", "CityB"], 30);

      expect(plan.duration).toBe("30 days");
      expect(plan.days).toHaveLength(2);
      expect(plan.days.every((day) => /CityA|CityB/.test(day.label))).toBe(true);
    });
  });

  it("formats generic plan cost ranges as rupee ranges", () => {
    const plan = generateTripPlan(COUNTRY_WITH_CITIES, "explorer" as never, [], 10);

    expect(plan.costPerPerson).toMatch(/^₹\d+(?:\.\d)?[KL] – ₹\d+(?:\.\d)?[KL]$/);
  });

  describe("custom style with selected cities", () => {
    it("returns one day-group per selected city", () => {
      const plan = generateTripPlan(COUNTRY_WITH_CITIES, "custom", ["CityA", "CityB"], 8);

      expect(plan.days).toHaveLength(2);
      expect(plan.days.map((day) => day.label)).toEqual([
        expect.stringContaining("CityA"),
        expect.stringContaining("CityB"),
      ]);
    });

    it("uses city-based activities that mention each selected city", () => {
      const plan = generateTripPlan(COUNTRY_WITH_CITIES, "custom", ["CityA", "CityB", "CityC"], 12);
      const allActivities = plan.days.flatMap((day) => day.activities).join(" ");

      expect(allActivities).toContain("CityA");
      expect(allActivities).toContain("CityB");
      expect(allActivities).toContain("CityC");
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
    it("handles a day-range counter without mistaking the range for the separator", () => {
      expect(extractCityFromLabel("Day 1–5 — Alpha")).toBe("Alpha");
      expect(extractCityFromLabel("Day 1-5 - Tokyo")).toBe("Tokyo");
    });
    it("preserves hyphenated city names", () => {
      expect(extractCityFromLabel("Day 2 — Aix-en-Provence")).toBe("Aix-en-Provence");
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

  describe("empty-data resilience (India-style non-seed country)", () => {
    const styles = ["custom", "touch-and-go", "explorer", "immersive"] as const;
    for (const style of styles) {
      for (const days of [1, 3, 7, 21]) {
        it(`does not crash for style=${style}, days=${days} with no experiences/budget/cities`, () => {
          const plan = generateTripPlan(EMPTY_COUNTRY, style as never, [], days);
          expect(plan.days.length).toBeGreaterThan(0);
          expect(plan.costPerPerson).toContain("₹");
          for (const day of plan.days) {
            for (const activity of day.activities) {
              expect(typeof activity).toBe("string");
              expect(activity.length).toBeGreaterThan(0);
            }
          }
        });
      }
    }

    it("tolerates selectedCities referencing an empty country", () => {
      expect(() =>
        generateTripPlan(EMPTY_COUNTRY, "custom", ["Nowhere"], 5),
      ).not.toThrow();
    });
  });
});

describe("tripPlans — rule-based DP selection", () => {
  const RULE = {
    cityOrder: ["Alpha", "Beta", "Gamma"],
    cities: {
      Alpha: {
        name: "Alpha",
        minDays: 2,
        recDays: 3,
        maxDays: 4,
        days: [
          { theme: "A1", activities: [{ name: "Museum", cost: "₹500" }] },
          { theme: "A2", activities: [{ name: "Market" }] },
        ],
      },
      Beta: {
        name: "Beta",
        minDays: 1,
        recDays: 2,
        maxDays: 3,
        days: [{ theme: "B1", activities: [{ name: "Beach" }] }],
      },
      Gamma: {
        name: "Gamma",
        minDays: 1,
        recDays: 1,
        maxDays: 2,
        days: [{ theme: "G1", activities: [{ name: "Hike" }] }],
      },
    },
    connections: [{ from: "Alpha", to: "Beta", method: "Train", cost: "₹800" }],
  };

  const COUNTRY = {
    name: "Ruleland",
    lat: 0,
    lng: 0,
    bestMonths: ["May"],
    budget: "₹1L–₹2L",
    experiences: ["Food"],
  } as const;

  it("fills exactly the requested days and keeps route order", () => {
    const plan = generateTripPlan(COUNTRY as never, "custom" as never, [], 6, RULE as never);
    expect(plan.days).toHaveLength(6);
    expect(plan.duration).toBe("6 days");
    const cities = plan.days.map((d) => d.label.split("— ")[1]);
    const firstAlpha = cities.indexOf("Alpha");
    const firstBeta = cities.indexOf("Beta");
    if (firstAlpha !== -1 && firstBeta !== -1) expect(firstAlpha).toBeLessThan(firstBeta);
  });

  it("honours user-selected cities and only those", () => {
    const plan = generateTripPlan(COUNTRY as never, "custom" as never, ["Alpha", "Gamma"], 5, RULE as never);
    const cities = new Set(plan.days.map((d) => d.label.split("— ")[1]));
    expect(cities.has("Alpha")).toBe(true);
    expect(cities.has("Gamma")).toBe(true);
    expect(cities.has("Beta")).toBe(false);
  });

  it("expands and warns when the day budget can't fit all selected cities", () => {
    // sum of mins for all three = 4; ask for 2 -> expands to 4 with a warning.
    const plan = generateTripPlan(COUNTRY as never, "custom" as never, ["Alpha", "Beta", "Gamma"], 2, RULE as never);
    expect(plan.days).toHaveLength(4);
    expect(plan.warning).toContain("tight");
  });

  it("plan cost tracks the selected basis and scales with trip length", () => {
    // recBaseline = Alpha(3) + Beta(2) + Gamma(1) = 6 days. At that length the
    // scale factor is 1, so the plan cost equals the chosen basis's budget chip.
    const withBudget = { ...COUNTRY, budgetBreakdown: { solo: "₹1L–₹2L", couple: "₹2L–₹4L", family4: "₹4L–₹8L" } };
    const couple = generateTripPlan(withBudget as never, "custom" as never, [], 6, RULE as never, "couple");
    expect(couple.costPerPerson).toBe("₹2L – ₹4L");
    expect(couple.costBasis).toBe("couple");
    const solo = generateTripPlan(withBudget as never, "custom" as never, [], 6, RULE as never, "solo");
    expect(solo.costPerPerson).toBe("₹1L – ₹2L");
    expect(solo.costBasis).toBe("solo");
    const family = generateTripPlan(withBudget as never, "custom" as never, [], 6, RULE as never, "family4");
    expect(family.costPerPerson).toBe("₹4L – ₹8L");
    // Longer trip scales up; the DP caps reachable days at 9 (sum of city maxima),
    // so factor = 9/6 = 1.5 rather than a naive 2×.
    const longer = generateTripPlan(withBudget as never, "custom" as never, [], 12, RULE as never, "couple");
    expect(longer.costPerPerson).toBe("₹3L – ₹6L");
  });

  it("defaults to the couple basis when none is supplied", () => {
    const withBudget = { ...COUNTRY, budgetBreakdown: { solo: "₹1L–₹2L", couple: "₹2L–₹4L", family4: "₹4L–₹8L" } };
    const plan = generateTripPlan(withBudget as never, "custom" as never, [], 6, RULE as never);
    expect(plan.costPerPerson).toBe("₹2L – ₹4L");
    expect(plan.costBasis).toBe("couple");
  });

  const EXP_RULE = {
    cityOrder: ["Dryton", "Foodville"],
    cities: {
      Dryton: {
        name: "Dryton",
        minDays: 1,
        recDays: 1,
        maxDays: 2,
        days: [{ theme: "History", activities: [{ name: "Old Fort" }] }],
      },
      Foodville: {
        name: "Foodville",
        minDays: 1,
        recDays: 1,
        maxDays: 2,
        days: [
          {
            theme: "Street Food Market",
            activities: [{ name: "Old Fort" }, { name: "Street Food Tour" }, { name: "Park Walk" }],
          },
        ],
      },
    },
    connections: [],
  };
  const EXP_COUNTRY = { name: "Tasteland", lat: 0, lng: 0, bestMonths: ["May"], budget: "₹1L–₹2L", experiences: ["Street Food"] } as const;

  it("surfaces experience-matching activities first within a day", () => {
    const base = generateTripPlan(EXP_COUNTRY as never, "custom" as never, ["Foodville"], 2, EXP_RULE as never);
    expect(base.days[0].activities[0]).toContain("Old Fort");

    const focused = generateTripPlan(EXP_COUNTRY as never, "custom" as never, ["Foodville"], 2, EXP_RULE as never, "couple", ["Street Food"]);
    expect(focused.days[0].activities[0]).toContain("Street Food");
  });

  it("boosts experience-matching cities in auto selection", () => {
    // 1-day budget fits only one city. Base value favours Dryton (route order);
    // a "Street Food" focus boosts Foodville's content match enough to win.
    const auto = generateTripPlan(EXP_COUNTRY as never, "custom" as never, [], 1, EXP_RULE as never);
    expect(auto.days.map((d) => d.label).join()).toContain("Dryton");

    const focused = generateTripPlan(EXP_COUNTRY as never, "custom" as never, [], 1, EXP_RULE as never, "couple", ["Street Food"]);
    expect(focused.days.map((d) => d.label).join()).toContain("Foodville");
  });
})

describe("recommendedDaysForSelection", () => {
  const RULE = {
    cityOrder: ["Alpha", "Beta", "Gamma"],
    cities: {
      Alpha: { name: "Alpha", minDays: 1, recDays: 3, maxDays: 5, days: [{ theme: "Temples tour", activities: [{ name: "Shrine" }] }] },
      Beta: { name: "Beta", minDays: 1, recDays: 2, maxDays: 4, days: [{ theme: "Street Food crawl", activities: [{ name: "Market" }] }] },
      Gamma: { name: "Gamma", minDays: 1, recDays: 4, maxDays: 6, days: [{ theme: "Beaches", activities: [{ name: "Coast" }] }] },
    },
    connections: [],
  } as never;

  it("uses the travel-style default when nothing is selected", () => {
    // explorer → recDays (3+2+4 = 9), no budget nudge.
    expect(
      recommendedDaysForSelection({ rule: RULE, style: "explorer", recDays: 9, maxDays: 15, selectedCities: [], selectedExperiences: [] }),
    ).toBe(9);
  });

  it("sums the recommended days of explicitly picked cities", () => {
    expect(
      recommendedDaysForSelection({ rule: RULE, style: "explorer", recDays: 9, maxDays: 15, selectedCities: ["Alpha", "Gamma"], selectedExperiences: [] }),
    ).toBe(7);
  });

  it("sums matching cities' days for a focus experience", () => {
    // "Street Food" matches only Beta (recDays 2).
    expect(
      recommendedDaysForSelection({ rule: RULE, style: "explorer", recDays: 9, maxDays: 15, selectedCities: [], selectedExperiences: ["Street Food"] }),
    ).toBe(2);
  });

  it("ignores the budget nudge on a pristine (unscoped) panel", () => {
    // No cities/experiences picked → seeds to the style default (recDays), so it
    // lines up with the static "Recommended" marker regardless of budget tier.
    expect(
      recommendedDaysForSelection({ rule: RULE, style: "explorer", recDays: 9, maxDays: 15, selectedCities: [], selectedExperiences: [], budgetTier: "premium" }),
    ).toBe(9);
    expect(
      recommendedDaysForSelection({ rule: RULE, style: "explorer", recDays: 9, maxDays: 15, selectedCities: [], selectedExperiences: [], budgetTier: "budget" }),
    ).toBe(9);
  });

  it("applies the budget-tier nudge once the plan is scoped and clamps to maxDays", () => {
    // Cities picked (3+4 = 7) → nudge applies.
    const premium = recommendedDaysForSelection({ rule: RULE, style: "explorer", recDays: 9, maxDays: 15, selectedCities: ["Alpha", "Gamma"], selectedExperiences: [], budgetTier: "premium" });
    const budget = recommendedDaysForSelection({ rule: RULE, style: "explorer", recDays: 9, maxDays: 15, selectedCities: ["Alpha", "Gamma"], selectedExperiences: [], budgetTier: "budget" });
    expect(premium).toBe(Math.round(7 * 1.15)); // 8
    expect(budget).toBe(Math.round(7 * 0.85)); // 6
    // Clamp: huge city-sum capped at maxDays.
    expect(
      recommendedDaysForSelection({ rule: RULE, style: "explorer", recDays: 9, maxDays: 6, selectedCities: ["Alpha", "Beta", "Gamma"], selectedExperiences: [], budgetTier: "premium" }),
    ).toBe(6);
  });

  it("falls back to the style default with no rule", () => {
    // touch-and-go → round(recDays*0.6) = round(5*0.6) = 3.
    expect(
      recommendedDaysForSelection({ rule: null, style: "touch-and-go", recDays: 5, maxDays: 10, selectedCities: ["X"], selectedExperiences: [] }),
    ).toBe(3);
  });
})

describe("topExperienceCities", () => {
  // Three cities all offer "Street Food"; importance descends Aa > Bb > Cc via
  // rec days + content depth + route order.
  const MULTI_RULE = {
    cityOrder: ["Aa", "Bb", "Cc"],
    cities: {
      Aa: { name: "Aa", minDays: 1, recDays: 3, maxDays: 4, days: [{ theme: "Street Food alley", activities: [{ name: "Stall" }] }, { theme: "More Street Food", activities: [{ name: "Market" }] }, { theme: "Street Food night", activities: [{ name: "Night bites" }] }] },
      Bb: { name: "Bb", minDays: 1, recDays: 2, maxDays: 3, days: [{ theme: "Street Food lane", activities: [{ name: "Snacks" }] }, { theme: "Street Food day 2", activities: [{ name: "Cafe" }] }] },
      Cc: { name: "Cc", minDays: 1, recDays: 1, maxDays: 2, days: [{ theme: "Street Food corner", activities: [{ name: "Kiosk" }] }] },
    },
    connections: [],
  } as never;

  it("returns the top cities for an experience, strongest first, capped at the limit", () => {
    expect(topExperienceCities(MULTI_RULE, ["Street Food"])).toEqual(["Aa", "Bb"]);
    expect(topExperienceCities(MULTI_RULE, ["Street Food"], 1)).toEqual(["Aa"]);
  });

  it("returns an empty list when no city matches", () => {
    expect(topExperienceCities(MULTI_RULE, ["Skiing"])).toEqual([]);
    expect(topExperienceCities(MULTI_RULE, [])).toEqual([]);
  });

  it("caps an experience day estimate at the top two cities, not every match", () => {
    // Only Aa (3) + Bb (2) = 5 count — Cc (1) is dropped though it also matches.
    expect(
      recommendedDaysForSelection({ rule: MULTI_RULE, style: "explorer", recDays: 6, maxDays: 20, selectedCities: [], selectedExperiences: ["Street Food"] }),
    ).toBe(5);
  });

  it("builds an experience-only plan from the top cities, excluding weaker matches", () => {
    const country = { name: "Snackland", lat: 0, lng: 0, bestMonths: ["May"], budget: "₹1L–₹2L", experiences: ["Street Food"] } as never;
    const plan = generateTripPlan(country, "custom" as never, [], 6, MULTI_RULE, "couple", ["Street Food"]);
    const labels = plan.days.map((d) => d.label).join();
    expect(labels).toContain("Aa");
    expect(labels).toContain("Bb");
    expect(labels).not.toContain("Cc");
  });

  // Two experiences that never co-occur in one city — mirrors Norway's
  // Fjords vs Northern Lights. Coverage must include the best city of EACH.
  const COVERAGE_RULE = {
    cityOrder: ["Fjordly", "Auroraville", "Auroratown"],
    cities: {
      // Best fjords city, but modest importance (recDays 2).
      Fjordly: { name: "Fjordly", minDays: 1, recDays: 2, maxDays: 3, experiences: ["Fjords"], days: [{ theme: "Fjord cruise", activities: [{ name: "Boat" }] }] },
      // Two high-importance aurora cities (recDays 3) that would monopolise a
      // global top-2 ranking and shut fjords out entirely.
      Auroraville: { name: "Auroraville", minDays: 1, recDays: 3, maxDays: 4, experiences: ["Northern Lights"], days: [{ theme: "Aurora hunt", activities: [{ name: "Sky" }] }] },
      Auroratown: { name: "Auroratown", minDays: 1, recDays: 3, maxDays: 4, experiences: ["Northern Lights"], days: [{ theme: "Aurora camp", activities: [{ name: "Camp" }] }] },
    },
    connections: [],
  } as never;

  it("covers every selected experience, not just the highest-importance theme", () => {
    const cities = topExperienceCities(COVERAGE_RULE, ["Fjords", "Northern Lights"]);
    expect(cities).toContain("Fjordly");
    expect(cities.some((c) => c === "Auroraville" || c === "Auroratown")).toBe(true);
    expect(cities).toHaveLength(2);
  });

  it("counts a city once when it satisfies multiple selected experiences", () => {
    const combo = {
      cityOrder: ["Both", "Solo"],
      cities: {
        Both: { name: "Both", minDays: 1, recDays: 3, maxDays: 4, experiences: ["Fjords", "Northern Lights"], days: [{ theme: "Both", activities: [{ name: "X" }] }] },
        Solo: { name: "Solo", minDays: 1, recDays: 1, maxDays: 2, experiences: ["Northern Lights"], days: [{ theme: "Aurora", activities: [{ name: "Y" }] }] },
      },
      connections: [],
    } as never;
    // "Both" champions Fjords AND Northern Lights → single city, no duplicate.
    expect(topExperienceCities(combo, ["Fjords", "Northern Lights"])).toEqual(["Both"]);
  });

  it("trusts authored city tags over a higher-importance derived match", () => {
    // Hub is the most important city and its content name-drops "fjord", but it
    // does NOT author Fjords; Cove authors it. Authored must win.
    const authoredVsDerived = {
      cityOrder: ["Hub", "Cove"],
      cities: {
        Hub: { name: "Hub", minDays: 1, recDays: 3, maxDays: 4, days: [{ theme: "Stroll along the Hubfjord", activities: [{ name: "Walk" }] }] },
        Cove: { name: "Cove", minDays: 1, recDays: 1, maxDays: 2, experiences: ["Fjords"], days: [{ theme: "Cruise", activities: [{ name: "Boat" }] }] },
      },
      connections: [],
    } as never;
    expect(topExperienceCities(authoredVsDerived, ["Fjords"], 1)).toEqual(["Cove"]);
  });
})

describe("cityExperienceStrength", () => {
  // Signature ⊆ authored ⊆ derivable. Fixture exercises all four tiers.
  const RULE = {
    cityOrder: ["Icon", "Listed", "Derived", "Denied"],
    cities: {
      // Signature: authored Fjords AND flagged as THE iconic fjords place.
      Icon: { name: "Icon", minDays: 1, recDays: 2, maxDays: 3, experiences: ["Fjords", "Waterfalls"], signatureExperiences: ["Fjords"], days: [{ theme: "Fjord", activities: [{ name: "Cruise" }] }] },
      // Authored but not signature.
      Listed: { name: "Listed", minDays: 1, recDays: 2, maxDays: 3, experiences: ["Fjords"], days: [{ theme: "Fjord day", activities: [{ name: "Boat" }] }] },
      // No authored array → derive from content ("fjord" keyword).
      Derived: { name: "Derived", minDays: 1, recDays: 2, maxDays: 3, days: [{ theme: "Walk by the fjord", activities: [{ name: "Stroll" }] }] },
      // Authored array present but Fjords deliberately omitted → strength 0.
      Denied: { name: "Denied", minDays: 1, recDays: 2, maxDays: 3, experiences: ["Food"], days: [{ theme: "Stroll by the fjord promenade", activities: [{ name: "Cafe" }] }] },
    },
    connections: [],
  } as never;

  it("ranks signature > authored > derived > none", () => {
    expect(cityExperienceStrength(RULE, "Icon", "Fjords")).toBe(3);
    expect(cityExperienceStrength(RULE, "Listed", "Fjords")).toBe(2);
    expect(cityExperienceStrength(RULE, "Derived", "Fjords")).toBe(1);
  });

  it("treats an authored array as authoritative — omitted tags score 0 even if content mentions them", () => {
    expect(cityExperienceStrength(RULE, "Denied", "Fjords")).toBe(0);
  });

  it("returns 0 for an unknown city", () => {
    expect(cityExperienceStrength(RULE, "Nowhere", "Fjords")).toBe(0);
  });

  it("lets a signature city win its theme over a higher-importance authored city", () => {
    // Hub is far more important (recDays 4) and authors Fjords, but Gem is the
    // signature fjords place → Gem must rank first.
    const rule = {
      cityOrder: ["Hub", "Gem"],
      cities: {
        Hub: { name: "Hub", minDays: 1, recDays: 4, maxDays: 5, experiences: ["Fjords"], days: [{ theme: "City", activities: [{ name: "Walk" }] }] },
        Gem: { name: "Gem", minDays: 1, recDays: 1, maxDays: 2, experiences: ["Fjords"], signatureExperiences: ["Fjords"], days: [{ theme: "Fjord", activities: [{ name: "Cruise" }] }] },
      },
      connections: [],
    } as never;
    expect(topExperienceCities(rule, ["Fjords"], 1)).toEqual(["Gem"]);
  });
})

describe("resolvePlannedCities — composable intent union", () => {
  // Oslo derives (not authors) Fjords via a name-drop; Flam is the signature
  // fjords city; Lofoten/Tromso author Northern Lights (Lofoten is signature).
  const RULE = {
    cityOrder: ["Oslo", "Flam", "Lofoten", "Tromso"],
    cities: {
      Oslo: { name: "Oslo", minDays: 1, recDays: 2, maxDays: 3, days: [{ theme: "Stroll the Oslofjord waterfront", activities: [{ name: "Walk" }] }] },
      Flam: { name: "Flam", minDays: 1, recDays: 2, maxDays: 3, experiences: ["Fjords"], signatureExperiences: ["Fjords"], days: [{ theme: "Fjord cruise", activities: [{ name: "Boat" }] }] },
      Lofoten: { name: "Lofoten", minDays: 1, recDays: 3, maxDays: 4, experiences: ["Northern Lights"], signatureExperiences: ["Northern Lights"], days: [{ theme: "Aurora", activities: [{ name: "Sky" }] }] },
      Tromso: { name: "Tromso", minDays: 1, recDays: 3, maxDays: 4, experiences: ["Northern Lights"], days: [{ theme: "Aurora hunt", activities: [{ name: "Camp" }] }] },
    },
    connections: [],
  } as never;

  it("returns only picked cities when no experiences are selected", () => {
    expect(resolvePlannedCities(RULE, ["Oslo", "Flam"], [])).toEqual(["Oslo", "Flam"]);
  });

  it("falls back to experience champions when no cities are picked", () => {
    expect(resolvePlannedCities(RULE, [], ["Fjords", "Northern Lights"])).toEqual(["Flam", "Lofoten"]);
  });

  it("honors picked cities AND experiences together (the union)", () => {
    // Oslo is kept; Fjords is uncovered (Oslo only DERIVES it) → Flam added;
    // Northern Lights uncovered → Lofoten added.
    expect(resolvePlannedCities(RULE, ["Oslo"], ["Fjords", "Northern Lights"])).toEqual(["Oslo", "Flam", "Lofoten"]);
  });

  it("does not let a loose derived match suppress a genuine champion", () => {
    // Oslo derives Fjords (strength 1) but that must NOT count as coverage —
    // the real fjords champion Flam still joins.
    expect(resolvePlannedCities(RULE, ["Oslo"], ["Fjords"])).toEqual(["Oslo", "Flam"]);
  });

  it("adds nothing when a picked city already authors the experience", () => {
    expect(resolvePlannedCities(RULE, ["Flam"], ["Fjords"])).toEqual(["Flam"]);
  });

  it("adds exactly one champion for a single uncovered experience", () => {
    // Northern Lights has two matching cities, but only one champion is added.
    expect(resolvePlannedCities(RULE, ["Flam"], ["Northern Lights"])).toEqual(["Flam", "Lofoten"]);
  });

  it("ignores unknown picked cities", () => {
    expect(resolvePlannedCities(RULE, ["Atlantis", "Flam"], [])).toEqual(["Flam"]);
  });

  it("keeps the day estimate in step with the resolved union", () => {
    // Oslo(2) + Flam(2, added champion) = 4 recommended days.
    const planned = resolvePlannedCities(RULE, ["Oslo"], ["Fjords"]);
    const expected = planned.reduce((s, n) => s + (RULE as never as { cities: Record<string, { recDays: number }> }).cities[n].recDays, 0);
    expect(
      recommendedDaysForSelection({ rule: RULE, style: "explorer", recDays: 10, maxDays: 20, selectedCities: ["Oslo"], selectedExperiences: ["Fjords"] }),
    ).toBe(expected);
  });

  it("builds an itinerary that visits both the picked city and the experience champion", () => {
    const country = { name: "Fjordland", lat: 0, lng: 0, bestMonths: ["Jun"], budget: "₹1L–₹2L", experiences: ["Fjords"] } as never;
    const plan = generateTripPlan(country, "custom" as never, ["Oslo"], 4, RULE, "couple", ["Fjords"]);
    const labels = plan.days.map((d) => d.label).join();
    expect(labels).toContain("Oslo");
    expect(labels).toContain("Flam");
  });
})

describe("composeTripPlan (multi-unit)", () => {
  const day = (label: string): { label: string; activities: string[] } => ({ label, activities: ["x"] });
  const norway: TripSegment = {
    name: "Norway",
    plan: {
      duration: "2 days",
      costPerPerson: "₹1L – ₹2L",
      days: [day("Day 1 — Oslo"), day("Day 2 — Flam")],
      note: "Norway note",
      costBasis: "couple",
    },
  };
  const denmark: TripSegment = {
    name: "Denmark",
    plan: {
      duration: "3 days",
      costPerPerson: "₹2L – ₹3L",
      days: [day("Day 1 — Copenhagen"), day("Day 2 — Copenhagen"), day("Day 3 — Aarhus")],
      note: "Denmark note",
      warning: "⚠️ tight",
      costBasis: "couple",
    },
  };

  it("returns the single segment's plan unchanged (single-destination path)", () => {
    expect(composeTripPlan([norway], "couple")).toBe(norway.plan);
  });

  it("returns an empty plan for no segments", () => {
    const plan = composeTripPlan([], "solo");
    expect(plan.days).toHaveLength(0);
    expect(plan.duration).toBe("0 days");
    expect(plan.costBasis).toBe("solo");
  });

  it("concatenates days in visit order with an honest total day count", () => {
    const plan = composeTripPlan([norway, denmark], "couple");
    expect(plan.days).toHaveLength(5);
    expect(plan.duration).toBe("5 days");
    expect(extractPlanCities(plan.days)).toEqual(["Oslo", "Flam", "Copenhagen", "Aarhus"]);
  });

  it("sums each unit's cost range and carries the basis", () => {
    const plan = composeTripPlan([norway, denmark], "couple");
    // 1L–2L + 2L–3L = 3L–5L
    expect(plan.costPerPerson).toBe("₹3L – ₹5L");
    expect(plan.costBasis).toBe("couple");
  });

  it("names the route in the note and aggregates unit warnings", () => {
    const plan = composeTripPlan([norway, denmark], "couple");
    expect(plan.note).toBe("A 2-stop route: Norway → Denmark.");
    expect(plan.warning).toBe("⚠️ tight");
  });

  it("omits the warning when no unit warns", () => {
    expect(composeTripPlan([norway, norway], "couple").warning).toBeUndefined();
  });

  it("renumbers days continuously across the route (no per-stop restart)", () => {
    const plan = composeTripPlan([norway, denmark], "couple");
    expect(plan.days.map((d) => d.label)).toEqual([
      "Day 1 — Oslo",
      "Day 2 — Flam",
      "Day 3 — Copenhagen",
      "Day 4 — Copenhagen",
      "Day 5 — Aarhus",
    ]);
  });
})

describe("shiftDayNumbers / shiftPlanDays", () => {
  it("returns the input unchanged for a zero offset", () => {
    expect(shiftDayNumbers("Day 1 — Oslo", 0)).toBe("Day 1 — Oslo");
    const days = [{ label: "Day 1 — Oslo", activities: ["x"] }];
    expect(shiftPlanDays(days, 0)).toBe(days);
  });

  it("shifts a single-day label without touching the ' — City' separator", () => {
    expect(shiftDayNumbers("Day 1 — Oslo", 11)).toBe("Day 12 — Oslo");
  });

  it("shifts both ends of a ranged label", () => {
    expect(shiftDayNumbers("Day 3–4 — Bergen", 10)).toBe("Day 13–14 — Bergen");
    expect(shiftDayNumbers("Day 1 – 2 — City", 5)).toBe("Day 6 – 7 — City");
  });

  it("shifts day numbers embedded in activity copy", () => {
    expect(shiftDayNumbers("Day 2: local food and markets", 4)).toBe("Day 6: local food and markets");
  });

  it("never treats 'Day trip' as a numbered day", () => {
    expect(shiftDayNumbers("Day trip to Nara", 4)).toBe("Day trip to Nara");
  });

  it("renumbers a plan's labels and activities by the offset", () => {
    const shifted = shiftPlanDays(
      [{ label: "Day 1 — Oslo", activities: ["Day 1: arrive"] }],
      3,
    );
    expect(shifted[0].label).toBe("Day 4 — Oslo");
    expect(shifted[0].activities).toEqual(["Day 4: arrive"]);
  });
})
