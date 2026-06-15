import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import manifestData from "../../data/rules/index.json";
import { LS_KEYS } from "../utils/lsKeys";

const { loadConsolidatedCountryMock } = vi.hoisted(() => ({
  loadConsolidatedCountryMock: vi.fn().mockResolvedValue(null),
}));

vi.mock("../hooks/useCountryRule", () => ({
  loadConsolidatedCountry: loadConsolidatedCountryMock,
}));

import { useCountryStore } from "../hooks/useCountryStore";
import type { Country } from "../types";

type ManifestEntry = { name: string; inSeed: boolean };

const seedNames = (manifestData as ManifestEntry[])
  .filter((entry) => entry.inSeed)
  .map((entry) => entry.name);

async function renderCountryStore() {
  const hook = renderHook(() => useCountryStore());
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  return hook;
}

describe("useCountryStore — P0", () => {
  it("includes seed countries in myListCountries on first load", async () => {
    const { result } = await renderCountryStore();

    expect(result.current.myListCountries.length).toBe(seedNames.length);
    expect(result.current.myListCountries.map((country) => country.name)).toContain("Vietnam");
    expect(result.current.myListCountries.map((country) => country.name)).toContain("Japan");
  });

  it("saveCountry adds a custom country and includes it in My List", async () => {
    const { result } = await renderCountryStore();
    const brazil: Country = {
      name: "Brazil",
      lat: -14.235,
      lng: -51.9253,
      region: "Americas",
      bestMonths: ["May"],
      budget: "₹200K",
      experiences: ["Beaches"],
    };

    act(() => {
      result.current.saveCountry(brazil);
    });

    expect(result.current.allCountries.some((country) => country.name === "Brazil")).toBe(true);
    expect(result.current.myListCountries.some((country) => country.name === "Brazil")).toBe(true);

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(LS_KEYS.CUSTOMS) ?? "[]")).toEqual([
        expect.objectContaining({ name: "Brazil" }),
      ]);
      expect(JSON.parse(localStorage.getItem(LS_KEYS.MY_LIST) ?? "[]")).toContain("Brazil");
    });
  });

  it("deleteCountry removes a seed country from the visible list and tombstones it", async () => {
    const { result } = await renderCountryStore();
    const vietnam = result.current.myListCountries.find((country) => country.name === "Vietnam");

    expect(vietnam).toBeDefined();

    act(() => {
      result.current.deleteCountry(vietnam!);
    });

    expect(result.current.myListCountries.some((country) => country.name === "Vietnam")).toBe(false);

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(LS_KEYS.DELETED) ?? "[]")).toContain("Vietnam");
    });
  });

  it("updateNotes updates notes on an existing country", async () => {
    const { result } = await renderCountryStore();

    act(() => {
      result.current.updateNotes("Vietnam", "  Great for food tours  ");
    });

    expect(result.current.allCountries.find((country) => country.name === "Vietnam")?.notes).toBe("Great for food tours");

    await waitFor(() => {
      const customs = JSON.parse(localStorage.getItem(LS_KEYS.CUSTOMS) ?? "[]") as Country[];
      expect(customs.find((country) => country.name === "Vietnam")?.notes).toBe("Great for food tours");
    });
  });

  it("addToList creates a minimal custom country for non-seed catalog entries", async () => {
    const { result } = await renderCountryStore();

    act(() => {
      result.current.addToList("Brazil");
    });

    const brazil = result.current.allCountries.find((country) => country.name === "Brazil");
    expect(brazil).toEqual({
      name: "Brazil",
      lat: -14.24,
      lng: -51.93,
      bestMonths: [],
      budget: "",
      experiences: [],
    });
    expect(result.current.myListCountries.some((country) => country.name === "Brazil")).toBe(true);

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(LS_KEYS.MY_LIST) ?? "[]")).toContain("Brazil");
    });
  });

  it("sorts favorites to the top of myListCountries", async () => {
    const { result } = await renderCountryStore();

    act(() => {
      result.current.favorites.add("Vietnam");
    });

    const names = result.current.myListCountries.map((country) => country.name);
    expect(names.indexOf("Vietnam")).toBeLessThan(names.indexOf("Australia"));
  });
});
