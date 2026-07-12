import { describe, it, expect } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePlanBuilder } from "@/hooks/usePlanBuilder.ts";
import type { Country } from "@/core/types.ts";
import { internationalSource } from "@/core/trip/internationalSource.ts";
import { domesticIndiaSource } from "@/core/trip/domesticIndiaSource.ts";

// A rule-less country (no matching data/rules file) keeps useCountryRule resolving
// to null synchronously, so the builder runs the deterministic generic path.
const COUNTRY: Country = {
  name: "Testland (no rule)",
  lat: 0,
  lng: 0,
  bestMonths: ["June", "July"],
  budget: "₹1L",
  experiences: ["Beaches", "Mountains", "Food"],
  cities: [
    { name: "Alpha", lat: 1, lng: 1, experiences: ["Beaches"] },
    { name: "Beta", lat: 2, lng: 2, experiences: ["Mountains"] },
    { name: "Gamma", lat: 3, lng: 3, experiences: ["Food"] },
  ],
};

describe("usePlanBuilder", () => {
  it("returns null plan for a null country", () => {
    const { result } = renderHook(() => usePlanBuilder(null, "couple", internationalSource));
    expect(result.current.plan).toBeNull();
    expect(result.current.displayCountry).toBeNull();
  });

  it("generates a live plan for a selected country", async () => {
    const { result } = renderHook(() => usePlanBuilder(COUNTRY, "couple", internationalSource));
    await waitFor(() => expect(result.current.plan).not.toBeNull());
    expect(result.current.plan?.days.length).toBeGreaterThan(0);
    expect(result.current.displayCountry?.name).toBe(COUNTRY.name);
  });

  // Regression: the primary stop must load its rule from the ACTIVE scope's store,
  // not the international one. A domestic state (Rajasthan) resolves no cities via
  // the international store, so passing the domestic source is what makes the
  // Places step non-empty for a within-India trip.
  it("loads a domestic state's cities via the domestic source", async () => {
    const rajasthan = domesticIndiaSource.resolveUnit("Rajasthan");
    expect(rajasthan).not.toBeNull();
    const { result } = renderHook(() => usePlanBuilder(rajasthan, "couple", domesticIndiaSource));
    await waitFor(() => expect(result.current.orderedCities.length).toBeGreaterThan(0));
    const cityNames = result.current.orderedCities.map((c) => c.name);
    expect(cityNames).toContain("Jaipur");
    expect(result.current.plan?.days.length).toBeGreaterThan(0);
  });

  it("finds no cities for a domestic state when using the international source", async () => {
    const rajasthan = domesticIndiaSource.resolveUnit("Rajasthan");
    const { result } = renderHook(() => usePlanBuilder(rajasthan, "couple", internationalSource));
    await waitFor(() => expect(result.current.ruleLoading).toBe(false));
    expect(result.current.rule).toBeNull();
  });

  it("hydrates from an initial draft and keeps it through the first mount", () => {
    const { result } = renderHook(() =>
      usePlanBuilder(COUNTRY, "couple", internationalSource, {
        selectedExperiences: ["Beaches"],
        selectedCities: ["Alpha"],
        customDays: 12,
        daysPinned: true,
      }),
    );
    // The destination-change reset must NOT fire on the first mount for the
    // hydrated country, so restored selections survive a refresh.
    expect(result.current.selectedExperiences).toEqual(["Beaches"]);
    expect(result.current.selectedCities).toEqual(["Alpha"]);
    expect(result.current.customDays).toBe(12);
    expect(result.current.daysPinned).toBe(true);
  });

  it("toggles experiences and cities", () => {
    const { result } = renderHook(() => usePlanBuilder(COUNTRY, "couple", internationalSource));
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
    };
    const { result } = renderHook(() => usePlanBuilder(norway, "couple", internationalSource));
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
    const { result } = renderHook(() => usePlanBuilder(COUNTRY, "couple", internationalSource));
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
    const { result, rerender } = renderHook(({ c }: { c: Country | null }) => usePlanBuilder(c, "couple", internationalSource), {
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

  it("restores a reopened saved trip's cities + pinned length + experiences via seed", async () => {
    const { result } = renderHook(
      ({ seed }: { seed?: { nonce: number; cities: string[]; days: number; experiences: string[] } | null }) =>
        usePlanBuilder(COUNTRY, "couple", internationalSource, undefined, seed),
      { initialProps: { seed: { nonce: 1, cities: ["Beta", "Ghost"], days: 11, experiences: ["Mountains"] } } },
    );
    await waitFor(() => expect(result.current.customDays).toBe(11));
    // Snapshot cities are restored (unknown "Ghost" is dropped) and pinned.
    expect(result.current.selectedCities).toEqual(["Beta"]);
    expect(result.current.daysPinned).toBe(true);
    // The saved experience focus is restored (not cleared).
    expect(result.current.selectedExperiences).toEqual(["Mountains"]);
  });

  it("re-applies a saved-trip seed only when its nonce changes", async () => {
    const { result, rerender } = renderHook(
      ({ seed }: { seed?: { nonce: number; cities: string[]; days: number; experiences: string[] } | null }) =>
        usePlanBuilder(COUNTRY, "couple", internationalSource, undefined, seed),
      { initialProps: { seed: { nonce: 1, cities: ["Alpha"], days: 8, experiences: [] } } },
    );
    await waitFor(() => expect(result.current.customDays).toBe(8));
    // A user edit after the restore must survive an unchanged seed (same nonce).
    act(() => result.current.setDays(15));
    rerender({ seed: { nonce: 1, cities: ["Alpha"], days: 8, experiences: [] } });
    expect(result.current.customDays).toBe(15);
    // A new nonce re-applies the (new) snapshot.
    rerender({ seed: { nonce: 2, cities: ["Beta"], days: 5, experiences: [] } });
    await waitFor(() => expect(result.current.customDays).toBe(5));
    expect(result.current.selectedCities).toEqual(["Beta"]);
  });

  it("orders experience-matching cities first", () => {
    const { result } = renderHook(() => usePlanBuilder(COUNTRY, "couple", internationalSource));
    act(() => result.current.toggleExperience("Food"));
    expect(result.current.orderedCities[0]?.name).toBe("Gamma");
  });

  it("projects the cities a candidate day count would visit without committing", async () => {
    const { result } = renderHook(() => usePlanBuilder(COUNTRY, "couple", internationalSource));
    await waitFor(() => expect(result.current.plan).not.toBeNull());
    const before = result.current.customDays;
    const projected = result.current.projectCities(before + 6);
    expect(Array.isArray(projected)).toBe(true);
    // Pure projection — it must not mutate the committed day count.
    expect(result.current.customDays).toBe(before);
  });

  it("projects an empty city list when there is no country", () => {
    const { result } = renderHook(() => usePlanBuilder(null, "couple", internationalSource));
    expect(result.current.projectCities(10)).toEqual([]);
  });
});
