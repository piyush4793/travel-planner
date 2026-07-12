import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { LS_KEYS } from "@/core/lsKeys.ts";

const { loadConsolidatedCountryMock } = vi.hoisted(() => ({
  loadConsolidatedCountryMock: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/data/consolidatedCountry.ts", () => ({
  loadConsolidatedCountry: loadConsolidatedCountryMock,
}));

import { useCountryStore } from "@/hooks/useCountryStore.ts";
import type { Country } from "@/core/types.ts";

async function renderCountryStore() {
  const hook = renderHook(() => useCountryStore());
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  return hook;
}

describe("useCountryStore — recents (implicit My List)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts with an empty My List for a fresh user (recents ledger)", async () => {
    const { result } = await renderCountryStore();
    expect(result.current.myListCountries).toEqual([]);
    expect(result.current.myListNames).toEqual([]);
  });

  it("recordPlanned prepends destinations most-recent-first, deduped, and persists", async () => {
    const { result } = await renderCountryStore();

    act(() => { result.current.recordPlanned(["Japan"]); });
    act(() => { result.current.recordPlanned(["Thailand", "France"]); });
    // Re-planning Japan moves it back to the front without duplicating.
    act(() => { result.current.recordPlanned(["Japan"]); });

    expect(result.current.myListNames).toEqual(["Japan", "Thailand", "France"]);
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(LS_KEYS.MY_LIST) ?? "[]")).toEqual([
        "Japan", "Thailand", "France",
      ]);
    });
  });

  it("caps the recents ledger at its maximum length", async () => {
    const { result } = await renderCountryStore();
    const many = Array.from({ length: 30 }, (_, i) => `Dest-${i}`);

    act(() => { result.current.recordPlanned(many); });

    // The raw ledger is capped at 24, most-recent (first-passed) retained.
    expect(result.current.recents.length).toBe(24);
    expect(result.current.recents[0]).toBe("Dest-0");
    expect(result.current.recents).not.toContain("Dest-24");
  });

  it("loads a legacy persisted MY_LIST array as the initial recents order", async () => {
    localStorage.setItem(LS_KEYS.MY_LIST, JSON.stringify(["Brazil", "Japan"]));
    const { result } = await renderCountryStore();

    expect(result.current.myListNames).toEqual(["Brazil", "Japan"]);
  });

  it("surfaces recents names that lack a seed/custom entry via a catalog stub", async () => {
    localStorage.setItem(LS_KEYS.MY_LIST, JSON.stringify(["Brazil"]));
    const { result } = await renderCountryStore();

    const brazil = result.current.myListCountries.find((c) => c.name === "Brazil");
    expect(brazil).toBeDefined();
    expect(brazil?.name).toBe("Brazil");
  });

  it("updateNotes updates notes on an existing country", async () => {
    const { result } = await renderCountryStore();

    act(() => {
      result.current.updateNotes("France", "  Great for food tours  ");
    });

    expect(result.current.allCountries.find((c) => c.name === "France")?.notes).toBe("Great for food tours");
    await waitFor(() => {
      const customs = JSON.parse(localStorage.getItem(LS_KEYS.CUSTOMS) ?? "[]") as Country[];
      expect(customs.find((c) => c.name === "France")?.notes).toBe("Great for food tours");
    });
  });

  it("reload re-reads recents from localStorage", async () => {
    const { result } = await renderCountryStore();
    expect(result.current.myListNames).toEqual([]);

    localStorage.setItem(LS_KEYS.MY_LIST, JSON.stringify(["Japan"]));
    act(() => { result.current.reload(); });

    expect(result.current.myListNames).toEqual(["Japan"]);
  });

  it("enriches a non-seed recents country (India) with rule-backed data", async () => {
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
    act(() => { result.current.recordPlanned(["India"]); });

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

  it("enriches seed countries in the background and exposes them via allCountries", async () => {
    loadConsolidatedCountryMock.mockImplementation(async (name: string) => {
      if (name === "Japan") {
        return {
          name: "Japan",
          lat: 36,
          lng: 138,
          region: "Asia",
          bestMonths: ["April", "October"],
          budget: "₹2L–₹3L",
          experiences: ["Temples", "Food"],
        };
      }
      return null;
    });

    const { result } = await renderCountryStore();
    await waitFor(() => {
      const japan = result.current.allCountries.find((c) => c.name === "Japan");
      expect(japan?.experiences).toContain("Temples");
    });

    loadConsolidatedCountryMock.mockResolvedValue(null);
  });

  it("resolves a manifest-only recents name absent from the world catalog", async () => {
    // Antarctica is rule-backed (manifest) but intentionally absent from the
    // sovereign world catalog — the store must fall back to the manifest stub.
    localStorage.setItem(LS_KEYS.MY_LIST, JSON.stringify(["Antarctica"]));
    const { result } = await renderCountryStore();

    expect(result.current.myListNames).toContain("Antarctica");
    expect(result.current.myListCountries.some((c) => c.name === "Antarctica")).toBe(true);
  });

  it("recordPlanned ignores empty and whitespace-only names", async () => {
    const { result } = await renderCountryStore();
    act(() => { result.current.recordPlanned(["   ", ""]); });
    expect(result.current.recents).toEqual([]);
  });

  it("updateNotes persists a note onto a catalog country and reload rehydrates it", async () => {
    const { result } = await renderCountryStore();
    act(() => { result.current.updateNotes("Japan", "  visa on arrival  "); });

    await waitFor(() => {
      const japan = result.current.allCountries.find((c) => c.name === "Japan");
      expect(japan?.notes).toBe("visa on arrival");
    });

    const persisted = JSON.parse(localStorage.getItem(LS_KEYS.CUSTOMS) ?? "[]") as Country[];
    expect(persisted.find((c) => c.name === "Japan")?.notes).toBe("visa on arrival");

    act(() => { result.current.reload(); });
    await waitFor(() => {
      const japan = result.current.allCountries.find((c) => c.name === "Japan");
      expect(japan?.notes).toBe("visa on arrival");
    });
  });

  it("updateNotes is a no-op for an unknown destination", async () => {
    const { result } = await renderCountryStore();
    act(() => { result.current.updateNotes("Nowhereland", "hello"); });
    const persisted = JSON.parse(localStorage.getItem(LS_KEYS.CUSTOMS) ?? "[]") as Country[];
    expect(persisted.some((c) => c.name === "Nowhereland")).toBe(false);
  });
});
