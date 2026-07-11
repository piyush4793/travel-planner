import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTripPlanner } from "../hooks/useTripPlanner";
import type { LoadedUnit } from "../core/trip/destinationSource";
import type { Country } from "../core/types";
import type { TripSegment } from "../core/utils/tripPlans";

function unit(name: string, cities: string[]): LoadedUnit {
  const country: Country = {
    name,
    lat: 0,
    lng: 0,
    bestMonths: ["March"],
    budget: "₹1L–₹2L",
    experiences: ["Food"],
    cities: cities.map((c, i) => ({ name: c, lat: i, lng: i, notes: "x" })),
  };
  return { country, rule: null };
}

const primarySegment: TripSegment = {
  name: "Primary",
  plan: {
    duration: "3 days",
    costPerPerson: "₹1L – ₹2L",
    days: [
      { label: "Day 1 — Home", activities: ["a"] },
      { label: "Day 2 — Home", activities: ["a"] },
      { label: "Day 3 — Home", activities: ["a"] },
    ],
    note: "primary",
    costBasis: "couple",
  },
};

describe("useTripPlanner", () => {
  it("derives one plan per unit, in selection order", () => {
    const units = [unit("Norway", ["Oslo", "Bergen"]), unit("Denmark", ["Copenhagen"])];
    const { result } = renderHook(() => useTripPlanner(units, [], "couple"));
    expect(result.current.unitPlans.map((u) => u.name)).toEqual(["Norway", "Denmark"]);
    for (const up of result.current.unitPlans) {
      expect(up.plan.days.length).toBeGreaterThan(0);
    }
  });

  it("toggling a city pins it as hand-picked for that unit only", () => {
    const units = [unit("Norway", ["Oslo", "Bergen"]), unit("Denmark", ["Copenhagen"])];
    const { result } = renderHook(() => useTripPlanner(units, [], "couple"));

    act(() => result.current.unitPlans[0].toggleCity("Bergen"));
    expect(result.current.unitPlans[0].selectedCities).toEqual(["Bergen"]);
    // The sibling unit is untouched.
    expect(result.current.unitPlans[1].selectedCities).toEqual([]);
  });

  it("clearCities reverts a unit back to the auto plan", () => {
    const units = [unit("Norway", ["Oslo", "Bergen"])];
    const { result } = renderHook(() => useTripPlanner(units, [], "couple"));

    act(() => result.current.unitPlans[0].toggleCity("Bergen"));
    expect(result.current.unitPlans[0].selectedCities).toEqual(["Bergen"]);
    act(() => result.current.unitPlans[0].clearCities());
    expect(result.current.unitPlans[0].selectedCities).toEqual([]);
  });

  it("composes the primary segment ahead of every unit into one honest plan", () => {
    const units = [unit("Norway", ["Oslo", "Bergen"]), unit("Denmark", ["Copenhagen"])];
    const { result } = renderHook(() => useTripPlanner(units, [], "couple"));

    const composed = result.current.composedPlan(primarySegment);
    const unitDays = result.current.unitPlans.reduce((n, u) => n + u.plan.days.length, 0);
    expect(composed.days.length).toBe(3 + unitDays);
    expect(composed.note).toBe("A 3-stop route: Primary → Norway → Denmark.");
  });

  it("prunes dropped units so they can't leak into a later composition", () => {
    const both = [unit("Norway", ["Oslo"]), unit("Denmark", ["Copenhagen"])];
    const { result, rerender } = renderHook(({ units }) => useTripPlanner(units, [], "couple"), {
      initialProps: { units: both },
    });
    expect(result.current.unitPlans).toHaveLength(2);
    rerender({ units: [both[0]] });
    expect(result.current.unitPlans.map((u) => u.name)).toEqual(["Norway"]);
  });

  it("restores each reopened stop's snapshot cities + pinned length + experiences via seed", () => {
    // Norway's Bergen offers "Fjords" so the restored override survives the
    // city-options clamp; Denmark keeps a deliberate empty override.
    const norway: LoadedUnit = {
      country: {
        name: "Norway",
        lat: 0,
        lng: 0,
        bestMonths: ["March"],
        budget: "₹1L–₹2L",
        experiences: ["Fjords"],
        cities: [
          { name: "Oslo", lat: 0, lng: 0, notes: "x" },
          { name: "Bergen", lat: 1, lng: 1, notes: "x", experiences: ["Fjords"] },
        ],
      },
      rule: null,
    };
    const units = [norway, unit("Denmark", ["Copenhagen"])];
    const seed = {
      nonce: 1,
      byCountry: {
        Norway: { cities: ["Bergen", "Ghost"], days: 9, experiences: ["Fjords"] },
        Denmark: { cities: ["Copenhagen"], days: 4, experiences: [] },
      },
    };
    const { result } = renderHook(() => useTripPlanner(units, [], "couple", seed));
    const [nor, den] = result.current.unitPlans;
    // Snapshot cities restored (unknown "Ghost" dropped), length pinned.
    expect(nor.selectedCities).toEqual(["Bergen"]);
    expect(nor.customDays).toBe(9);
    expect(nor.daysPinned).toBe(true);
    // Norway's saved per-stop experience override is restored.
    expect(nor.experiences).toEqual(["Fjords"]);
    expect(den.selectedCities).toEqual(["Copenhagen"]);
    expect(den.customDays).toBe(4);
    expect(den.daysPinned).toBe(true);
    expect(den.experiences).toEqual([]);
  });

  it("waits for every seeded stop to load before applying a saved-trip seed", () => {
    const seed = { nonce: 1, byCountry: { Norway: { cities: ["Bergen"], days: 9, experiences: [] }, Denmark: { cities: ["Copenhagen"], days: 4, experiences: [] } } };
    // Only Norway has loaded — the seed must not apply yet (Denmark still pending),
    // so Norway keeps its auto-seeded length rather than the snapshot's.
    const { result, rerender } = renderHook(({ units }) => useTripPlanner(units, [], "couple", seed), {
      initialProps: { units: [unit("Norway", ["Oslo", "Bergen"])] },
    });
    expect(result.current.unitPlans[0].daysPinned).toBe(false);
    // Denmark lands: now the whole snapshot applies at once.
    rerender({ units: [unit("Norway", ["Oslo", "Bergen"]), unit("Denmark", ["Copenhagen"])] });
    expect(result.current.unitPlans[0].customDays).toBe(9);
    expect(result.current.unitPlans[0].daysPinned).toBe(true);
    expect(result.current.unitPlans[1].customDays).toBe(4);
  });
});

describe("useTripPlanner per-stop length levers", () => {
  it("seeds each stop's length from its recommendation and reports its bounds", () => {
    const units = [unit("Norway", ["Oslo", "Bergen"])];
    const { result } = renderHook(() => useTripPlanner(units, [], "couple"));
    const up = result.current.unitPlans[0];
    expect(up.customDays).toBe(up.recommendedDays);
    expect(up.daysPinned).toBe(false);
    expect(up.maxDays).toBeGreaterThanOrEqual(1);
  });

  it("setDays pins one stop's length without touching its siblings", () => {
    const units = [unit("Norway", ["Oslo", "Bergen"]), unit("Denmark", ["Copenhagen"])];
    const { result } = renderHook(() => useTripPlanner(units, [], "couple"));
    const siblingBefore = result.current.unitPlans[1].customDays;

    act(() => result.current.unitPlans[0].setDays(9));
    expect(result.current.unitPlans[0].customDays).toBe(9);
    expect(result.current.unitPlans[0].daysPinned).toBe(true);
    expect(result.current.unitPlans[1].customDays).toBe(siblingBefore);
    expect(result.current.unitPlans[1].daysPinned).toBe(false);
  });

  it("resetDays clears the pin so the recommendation re-seeds", () => {
    const units = [unit("Norway", ["Oslo", "Bergen"])];
    const { result } = renderHook(() => useTripPlanner(units, [], "couple"));
    const rec = result.current.unitPlans[0].recommendedDays;

    act(() => result.current.unitPlans[0].setDays(rec + 4));
    expect(result.current.unitPlans[0].customDays).toBe(rec + 4);
    act(() => result.current.unitPlans[0].resetDays());
    expect(result.current.unitPlans[0].daysPinned).toBe(false);
    expect(result.current.unitPlans[0].customDays).toBe(rec);
  });

  it("projectCities previews a candidate length without committing it", () => {
    const units = [unit("Norway", ["Oslo", "Bergen"])];
    const { result } = renderHook(() => useTripPlanner(units, [], "couple"));
    const up = result.current.unitPlans[0];
    const projected = up.projectCities(up.maxDays);
    expect(Array.isArray(projected)).toBe(true);
    // Projection must not mutate committed state.
    expect(result.current.unitPlans[0].daysPinned).toBe(false);
  });
});

/** A unit whose cities carry experience tags, for per-country focus tests. */
function tagged(name: string, cities: { city: string; tags: string[] }[]): LoadedUnit {
  const country: Country = {
    name,
    lat: 0,
    lng: 0,
    bestMonths: ["March"],
    budget: "₹1L–₹2L",
    experiences: ["Food"],
    cities: cities.map((c, i) => ({ name: c.city, lat: i, lng: i, notes: "x", experiences: c.tags })),
  };
  return { country, rule: null };
}

describe("useTripPlanner per-country experiences", () => {
  it("inherits the trip seed (clamped to what the stop offers) until it diverges", () => {
    const units = [
      tagged("Norway", [{ city: "Bergen", tags: ["Fjords", "Food"] }]),
      tagged("Denmark", [{ city: "Copenhagen", tags: ["Design", "Food"] }]),
    ];
    const { result } = renderHook(() => useTripPlanner(units, ["Food"], "couple"));
    expect(result.current.unitPlans[0].experiences).toEqual(["Food"]);
    expect(result.current.unitPlans[1].experiences).toEqual(["Food"]);
  });

  it("drops seed tags a stop can't deliver from its surfaced focus", () => {
    const units = [tagged("Norway", [{ city: "Bergen", tags: ["Fjords"] }])];
    // "Beaches" isn't offered by any Norwegian city here, so it's inert and hidden.
    const { result } = renderHook(() => useTripPlanner(units, ["Beaches"], "couple"));
    expect(result.current.unitPlans[0].experiences).toEqual([]);
  });

  it("toggling a stop's experience diverges only that stop from the seed", () => {
    const units = [
      tagged("Norway", [{ city: "Bergen", tags: ["Fjords", "Food"] }]),
      tagged("Denmark", [{ city: "Copenhagen", tags: ["Design", "Food"] }]),
    ];
    const { result } = renderHook(() => useTripPlanner(units, ["Food"], "couple"));
    act(() => result.current.unitPlans[0].toggleExperience("Fjords"));
    expect(result.current.unitPlans[0].experiences).toEqual(["Food", "Fjords"]);
    // The sibling still inherits the untouched seed.
    expect(result.current.unitPlans[1].experiences).toEqual(["Food"]);
  });

  it("clearExperiences sets an explicit none, independent of the seed", () => {
    const units = [tagged("Norway", [{ city: "Bergen", tags: ["Fjords", "Food"] }])];
    const { result } = renderHook(() => useTripPlanner(units, ["Food"], "couple"));
    expect(result.current.unitPlans[0].experiences).toEqual(["Food"]);
    act(() => result.current.unitPlans[0].clearExperiences());
    expect(result.current.unitPlans[0].experiences).toEqual([]);
  });

  it("exposes each stop's distinct experience tags as Filters options", () => {
    const units = [
      tagged("Norway", [
        { city: "Bergen", tags: ["Fjords", "Food"] },
        { city: "Oslo", tags: ["Food", "History"] },
      ]),
    ];
    const { result } = renderHook(() => useTripPlanner(units, [], "couple"));
    expect(result.current.unitPlans[0].experienceOptions).toEqual(["Fjords", "Food", "History"]);
  });
});
