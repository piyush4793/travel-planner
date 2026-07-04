import { describe, it, expect } from "vitest";
import { generateTripPlan, getMaxRuleDays, getRecRuleDays, recommendedDaysForSelection, extractCityFromLabel, extractPlanCities, isRealCity, normalizeCityName } from "../core/utils/tripPlans";
import type { Country } from "../core/types";

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

  it("applies the budget-tier nudge and clamps to maxDays", () => {
    const premium = recommendedDaysForSelection({ rule: RULE, style: "explorer", recDays: 9, maxDays: 15, selectedCities: [], selectedExperiences: [], budgetTier: "premium" });
    const budget = recommendedDaysForSelection({ rule: RULE, style: "explorer", recDays: 9, maxDays: 15, selectedCities: [], selectedExperiences: [], budgetTier: "budget" });
    expect(premium).toBe(Math.round(9 * 1.15)); // 10
    expect(budget).toBe(Math.round(9 * 0.85)); // 8
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
