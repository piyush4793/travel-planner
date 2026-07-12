import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import manifestData from "../../../data/rules/index.json";
import { LS_KEYS } from "@/core/lsKeys.ts";

const { loadConsolidatedCountryMock } = vi.hoisted(() => ({
  loadConsolidatedCountryMock: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/data/consolidatedCountry.ts", () => ({
  loadConsolidatedCountry: loadConsolidatedCountryMock,
}));

import { useCountryStore } from "@/hooks/useCountryStore.ts";
import type { Country } from "@/core/types.ts";

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
    expect(result.current.myListCountries.map((country) => country.name)).toContain("France");
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
    const vietnam = result.current.myListCountries.find((country) => country.name === "France");

    expect(vietnam).toBeDefined();

    act(() => {
      result.current.deleteCountry(vietnam!);
    });

    expect(result.current.myListCountries.some((country) => country.name === "France")).toBe(false);

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(LS_KEYS.DELETED) ?? "[]")).toContain("France");
    });
  });

  it("updateNotes updates notes on an existing country", async () => {
    const { result } = await renderCountryStore();

    act(() => {
      result.current.updateNotes("France", "  Great for food tours  ");
    });

    expect(result.current.allCountries.find((country) => country.name === "France")?.notes).toBe("Great for food tours");

    await waitFor(() => {
      const customs = JSON.parse(localStorage.getItem(LS_KEYS.CUSTOMS) ?? "[]") as Country[];
      expect(customs.find((country) => country.name === "France")?.notes).toBe("Great for food tours");
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
      result.current.favorites.add("Thailand");
    });

    const names = result.current.myListCountries.map((country) => country.name);
    expect(names.indexOf("Thailand")).toBeLessThan(names.indexOf("France"));
  });

  it("surfaces My List names that lack a seed or custom entry (legacy data resilience)", async () => {
    // Simulate a My List persisted by an older build: a non-seed name is tracked
    // but there is no matching CUSTOMS stub to back it.
    localStorage.setItem(LS_KEYS.MY_LIST, JSON.stringify([...seedNames, "Brazil"]));
    const { result } = await renderCountryStore();

    const names = result.current.myListCountries.map((country) => country.name);
    expect(names).toContain("Brazil");
    expect(result.current.myListCountries.length).toBe(seedNames.length + 1);
  });

  it("addManyToList adds several destinations in one call", async () => {
    const { result } = await renderCountryStore();

    act(() => {
      result.current.addManyToList(["Brazil", "Argentina", "Peru"]);
    });

    for (const name of ["Brazil", "Argentina", "Peru"]) {
      expect(result.current.myListNames).toContain(name);
    }
    await waitFor(() => {
      const list = JSON.parse(localStorage.getItem(LS_KEYS.MY_LIST) ?? "[]");
      expect(list).toEqual(expect.arrayContaining(["Brazil", "Argentina", "Peru"]));
    });
  });

  it("addManyToList revives a tombstoned seed country", async () => {
    const { result } = await renderCountryStore();
    const seed = result.current.myListCountries.find((c) => c.name === "France")!;

    act(() => {
      result.current.deleteCountry(seed);
    });
    expect(result.current.myListNames).not.toContain("France");

    act(() => {
      result.current.addManyToList(["France"]);
    });
    expect(result.current.myListNames).toContain("France");
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(LS_KEYS.DELETED) ?? "[]")).not.toContain("France");
    });
  });

  it("addManyToList adds a rule-only destination not present in the world catalog", async () => {
    const { result } = await renderCountryStore();

    // Antarctica is rule-backed (manifest) but intentionally absent from the
    // sovereign world catalog — the store must fall back to the manifest.
    expect(result.current.catalog.some((c) => c.name === "Antarctica")).toBe(false);

    act(() => {
      result.current.addManyToList(["Antarctica"]);
    });

    expect(result.current.myListNames).toContain("Antarctica");
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(LS_KEYS.MY_LIST) ?? "[]")).toContain("Antarctica");
    });
  });

  it("resetToDefaultList restores the starter seed list", async () => {
    const { result } = await renderCountryStore();

    act(() => {
      result.current.addToList("Brazil");
    });
    expect(result.current.myListNames).toContain("Brazil");

    act(() => {
      result.current.resetToDefaultList();
    });

    expect(result.current.myListNames).not.toContain("Brazil");
    expect([...result.current.myList.set].sort()).toEqual([...seedNames].sort());
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(LS_KEYS.DELETED) ?? "[]")).toEqual([]);
    });
  });
});
