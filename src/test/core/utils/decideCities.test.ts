import { describe, it, expect } from "vitest";
import { decideCities, sortDecisions, summarizeFocus, type DecideCitiesInput } from "@/core/utils/decideCities.ts";
import type { CountryRule } from "@/core/data/itineraryRules.ts";
import type { CityEntry } from "@/core/types.ts";

type RuleDay = CountryRule["cities"][string]["days"][number];
const day = (t: string): RuleDay => ({ theme: t, activities: [{ name: "Walk" }] });

function rule(
  cities: { name: string; recDays: number; depth: number; signature?: string[] }[],
): CountryRule {
  const map: CountryRule["cities"] = {};
  for (const c of cities) {
    map[c.name] = {
      name: c.name,
      minDays: 1,
      recDays: c.recDays,
      maxDays: c.recDays + 2,
      signatureExperiences: c.signature,
      days: Array.from({ length: c.depth }, (_, i) => day(`T${i}`)),
    };
  }
  return { cityOrder: cities.map((c) => c.name), cities: map, connections: [] };
}

function city(name: string, opts: Partial<CityEntry> = {}): CityEntry {
  return { name, lat: 0, lng: 0, ...opts };
}

const baseInput = (over: Partial<DecideCitiesInput> = {}): DecideCitiesInput => ({
  orderedCities: [
    city("Bergen", { experiences: ["Fjords", "Food"], bestMonths: ["May", "June", "July", "August", "September"] }),
    city("Tromsø", { experiences: ["Northern Lights", "Arctic"], bestMonths: ["November", "December", "January", "February", "March"] }),
    city("Oslo", { experiences: ["History", "Food"] }),
  ],
  selectedCities: [],
  autoSelectedCities: ["Bergen", "Tromsø"],
  activeExperiences: ["Fjords"],
  rule: rule([
    { name: "Bergen", recDays: 2, depth: 4, signature: ["Fjords"] },
    { name: "Tromsø", recDays: 2, depth: 3, signature: ["Northern Lights"] },
    { name: "Oslo", recDays: 1, depth: 1 },
  ]),
  ...over,
});

describe("decideCities", () => {
  it("marks the auto-plan as included when nothing is hand-picked", () => {
    const d = decideCities(baseInput());
    expect(d.find((c) => c.name === "Bergen")?.included).toBe(true);
    expect(d.find((c) => c.name === "Oslo")?.included).toBe(false);
  });

  it("prefers hand-picks over the auto-plan for inclusion", () => {
    const d = decideCities(baseInput({ selectedCities: ["Oslo"] }));
    expect(d.find((c) => c.name === "Oslo")?.included).toBe(true);
    expect(d.find((c) => c.name === "Bergen")?.included).toBe(false);
  });

  it("splits experiences into focus matches vs the rest", () => {
    const bergen = decideCities(baseInput()).find((c) => c.name === "Bergen")!;
    expect(bergen.focusMatches).toEqual(["Fjords"]);
    expect(bergen.otherExperiences).toEqual(["Food"]);
  });

  it("derives recDays and best window from rule + city data", () => {
    const bergen = decideCities(baseInput()).find((c) => c.name === "Bergen")!;
    expect(bergen.recDays).toBe(2);
    expect(bergen.bestWindow).toBe("May–Sep");
    const oslo = decideCities(baseInput()).find((c) => c.name === "Oslo")!;
    expect(oslo.bestWindow).toBeNull();
  });

  it("surfaces the avoid window and 'known for' brief for a decision card", () => {
    const input = baseInput({
      orderedCities: [
        city("Tromsø", {
          notes: "  Arctic aurora gateway  ",
          experiences: ["Northern Lights"],
          bestMonths: ["December", "January"],
          worstMonths: ["June", "July"],
        }),
        city("Oslo", { experiences: ["History"] }),
      ],
      autoSelectedCities: ["Tromsø"],
    });
    const [tromso, oslo] = decideCities(input);
    expect(tromso.brief).toBe("Arctic aurora gateway");
    expect(tromso.avoidWindow).toBe("Jun–Jul");
    // No notes / worstMonths → null, so the card omits those rows.
    expect(oslo.brief).toBeNull();
    expect(oslo.avoidWindow).toBeNull();
  });

  it("emits a signature signal, preferring a focused theme", () => {
    const bergen = decideCities(baseInput()).find((c) => c.name === "Bergen")!;
    expect(bergen.signal).toBe("Top for Fjords");
    const tromso = decideCities(baseInput()).find((c) => c.name === "Tromsø")!;
    expect(tromso.signal).toBe("Top for Northern Lights");
    expect(decideCities(baseInput()).find((c) => c.name === "Oslo")?.signal).toBeNull();
  });

  it("emits no focus matches when there is no active focus", () => {
    const d = decideCities(baseInput({ activeExperiences: [] }));
    expect(d.every((c) => c.focusMatches.length === 0)).toBe(true);
  });

  it("degrades gracefully with no rule", () => {
    const d = decideCities(baseInput({ rule: null }));
    expect(d.every((c) => c.recDays === 0 && c.importance === 0 && c.signal === null)).toBe(true);
  });
});

describe("sortDecisions", () => {
  it("best-match leads with focus fit then importance, without mutating input", () => {
    const d = decideCities(baseInput());
    const sorted = sortDecisions(d, "best");
    expect(sorted[0].name).toBe("Bergen");
    expect(d[0].name).toBe("Bergen"); // original order preserved
  });

  it("iconic orders by importance", () => {
    const d = decideCities(baseInput());
    const sorted = sortDecisions(d, "iconic");
    expect(sorted[0].importance).toBeGreaterThanOrEqual(sorted[sorted.length - 1].importance);
  });

  it("days surfaces the shortest stay first", () => {
    const d = decideCities(baseInput());
    const sorted = sortDecisions(d, "days");
    expect(sorted[0].name).toBe("Oslo");
  });
});

describe("summarizeFocus", () => {
  it("returns null when nothing is focused", () => {
    expect(summarizeFocus([])).toBeNull();
  });

  it("lists names verbatim within the cap", () => {
    expect(summarizeFocus(["Fjords", "Food"])).toBe("Fjords, Food");
    expect(summarizeFocus(["Fjords", "Food", "History"])).toBe("Fjords, Food, History");
  });

  it("caps the list and counts the overflow", () => {
    expect(summarizeFocus(["Fjords", "Food", "History", "Hiking", "Beaches"])).toBe(
      "Fjords, Food, History +2 more",
    );
  });

  it("honors a custom cap", () => {
    expect(summarizeFocus(["Fjords", "Food", "History"], 1)).toBe("Fjords +2 more");
  });
});
