import { describe, it, expect } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePlanBuilder } from "../hooks/usePlanBuilder";
import type { Country } from "../core/types";

// A rule-less country (no matching data/rules file) keeps useCountryRule resolving
// to null synchronously, so the builder runs the deterministic generic path.
const COUNTRY: Country = {
  name: "Testland (no rule)",
  lat: 0,
  lng: 0,
  bestMonths: ["June", "July"],
  budget: "₹1L",
  experiences: ["Beaches", "Mountains", "Food"],
  travelStyle: ["explorer"],
  cities: [
    { name: "Alpha", lat: 1, lng: 1, experiences: ["Beaches"] },
    { name: "Beta", lat: 2, lng: 2, experiences: ["Mountains"] },
    { name: "Gamma", lat: 3, lng: 3, experiences: ["Food"] },
  ],
};

describe("usePlanBuilder", () => {
  it("returns null plan for a null country", () => {
    const { result } = renderHook(() => usePlanBuilder(null, "couple"));
    expect(result.current.plan).toBeNull();
    expect(result.current.displayCountry).toBeNull();
  });

  it("generates a live plan for a selected country", async () => {
    const { result } = renderHook(() => usePlanBuilder(COUNTRY, "couple"));
    await waitFor(() => expect(result.current.plan).not.toBeNull());
    expect(result.current.plan?.days.length).toBeGreaterThan(0);
    expect(result.current.displayCountry?.name).toBe(COUNTRY.name);
  });

  it("toggles experiences and cities", () => {
    const { result } = renderHook(() => usePlanBuilder(COUNTRY, "couple"));
    act(() => result.current.toggleExperience("Beaches"));
    expect(result.current.selectedExperiences).toEqual(["Beaches"]);
    act(() => result.current.toggleExperience("Beaches"));
    expect(result.current.selectedExperiences).toEqual([]);

    act(() => result.current.toggleCity("Alpha"));
    expect(result.current.selectedCities).toEqual(["Alpha"]);
    act(() => result.current.clearCities());
    expect(result.current.selectedCities).toEqual([]);
  });

  it("materializes the auto-picked cities and holds length on first hand-pick", async () => {
    // A ruled country whose auto plan visits real cities, so autoSelectedCities is non-empty.
    const norway: Country = {
      name: "Norway",
      lat: 60,
      lng: 8,
      bestMonths: ["June", "July"],
      budget: "₹3L",
      experiences: ["Fjords"],
      travelStyle: ["explorer"],
    };
    const { result } = renderHook(() => usePlanBuilder(norway, "couple"));
    await waitFor(() => expect(result.current.autoSelectedCities.length).toBeGreaterThan(0));

    const auto = result.current.autoSelectedCities;
    const drop = auto[0];

    // Dropping an auto-picked city materializes the full set minus that city.
    act(() => result.current.toggleCity(drop));
    expect(result.current.selectedCities).toEqual(auto.filter((c) => c !== drop));
    expect(result.current.selectedCities).not.toContain(drop);
    expect(result.current.daysPinned).toBe(true);
    // Once curating, autoSelectedCities collapses (selection is the source of truth).
    expect(result.current.autoSelectedCities).toEqual([]);

    // Reset returns to auto mode and unpins the length.
    act(() => result.current.clearCities());
    expect(result.current.selectedCities).toEqual([]);
    expect(result.current.daysPinned).toBe(false);
  });

  it("pins the day count once set and unpins on reset", async () => {
    const { result } = renderHook(() => usePlanBuilder(COUNTRY, "couple"));
    await waitFor(() => expect(result.current.plan).not.toBeNull());
    const seeded = result.current.customDays;

    act(() => result.current.setDays(seeded + 5));
    expect(result.current.daysPinned).toBe(true);
    expect(result.current.customDays).toBe(seeded + 5);

    // Changing an upstream knob must NOT override a pinned value.
    act(() => result.current.toggleExperience("Mountains"));
    expect(result.current.customDays).toBe(seeded + 5);

    act(() => result.current.resetDays());
    expect(result.current.daysPinned).toBe(false);
  });

  it("resets funnel state when the country changes", async () => {
    const { result, rerender } = renderHook(({ c }: { c: Country | null }) => usePlanBuilder(c, "couple"), {
      initialProps: { c: COUNTRY },
    });
    act(() => {
      result.current.toggleCity("Alpha");
      result.current.setDays(10);
    });
    expect(result.current.selectedCities).toEqual(["Alpha"]);

    const OTHER: Country = { ...COUNTRY, name: "Otherland (no rule)" };
    rerender({ c: OTHER });
    await waitFor(() => expect(result.current.displayCountry?.name).toBe(OTHER.name));
    expect(result.current.selectedCities).toEqual([]);
    expect(result.current.daysPinned).toBe(false);
  });

  it("orders experience-matching cities first", () => {
    const { result } = renderHook(() => usePlanBuilder(COUNTRY, "couple"));
    act(() => result.current.toggleExperience("Food"));
    expect(result.current.orderedCities[0]?.name).toBe("Gamma");
  });
});
