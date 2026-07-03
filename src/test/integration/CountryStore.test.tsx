import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useCountryStore } from "../../hooks/useCountryStore";
import type { Country } from "../../core/types";

const { loadConsolidatedCountryMock } = vi.hoisted(() => ({
  loadConsolidatedCountryMock: vi.fn().mockResolvedValue(null),
}));

vi.mock("maplibre-gl", () => ({
  default: { Map: vi.fn(), Marker: vi.fn() },
  Map: vi.fn(),
  Marker: vi.fn(),
}));

vi.mock("../../data/consolidatedCountry", () => ({
  loadConsolidatedCountry: loadConsolidatedCountryMock,
}));

async function renderCountryStore() {
  const hook = renderHook(() => useCountryStore());
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  return hook;
}

describe("useCountryStore integration", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("starts with seed countries in myListNames", async () => {
    const { result } = await renderCountryStore();

    expect(result.current.myListNames.length).toBeGreaterThan(0);
    expect(result.current.myListNames).toContain("Japan");
  });

  it("adds a catalog country to the list", async () => {
    const { result } = await renderCountryStore();

    act(() => {
      result.current.addToList("Brazil");
    });

    expect(result.current.myListNames).toContain("Brazil");
  });

  it("removes a saved country from myListNames when deleted", async () => {
    const { result } = await renderCountryStore();
    const testCountry: Country = {
      name: "TestCountry",
      lat: 1,
      lng: 2,
      region: "Asia",
      bestMonths: ["January"],
      budget: "₹1L",
      experiences: ["Culture"],
    };

    act(() => {
      result.current.saveCountry(testCountry);
    });
    expect(result.current.myListNames).toContain("TestCountry");

    act(() => {
      result.current.deleteCountry(testCountry);
    });

    expect(result.current.myListNames).not.toContain("TestCountry");
  });

  it("toggles favorites and visited sets", async () => {
    const { result } = await renderCountryStore();

    act(() => {
      result.current.favorites.toggle("Japan");
      result.current.visited.toggle("Japan");
    });

    expect(result.current.favorites.set.has("Japan")).toBe(true);
    expect(result.current.visited.set.has("Japan")).toBe(true);
  });

  it("saves a new country into myListCountries", async () => {
    const { result } = await renderCountryStore();
    const newCountry: Country = {
      name: "TestCountry",
      lat: 1,
      lng: 2,
      region: "Asia",
      bestMonths: ["January"],
      budget: "₹1L",
      experiences: ["Culture"],
    };

    act(() => {
      result.current.saveCountry(newCountry);
    });

    expect(result.current.myListCountries).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "TestCountry" })]),
    );
  });

  it("enriches a non-seed My List country (India) with rule-backed data", async () => {
    loadConsolidatedCountryMock.mockImplementation(async (name: string) => {
      if (name === "India") {
        return {
          name: "India",
          lat: 20,
          lng: 78,
          region: "Asia",
          bestMonths: ["November", "December"],
          budget: "₹1L–₹2L",
          experiences: ["Taj Mahal", "Street food", "Backwaters"],
        };
      }
      return null;
    });

    const { result } = await renderCountryStore();

    act(() => {
      result.current.addToList("India");
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const india = result.current.myListCountries.find((c) => c.name === "India");
    expect(india).toBeDefined();
    expect(india?.experiences).toEqual(["Taj Mahal", "Street food", "Backwaters"]);
    expect(india?.budget).toBe("₹1L–₹2L");
    expect(india?.bestMonths).toContain("November");

    loadConsolidatedCountryMock.mockResolvedValue(null);
  });
});
