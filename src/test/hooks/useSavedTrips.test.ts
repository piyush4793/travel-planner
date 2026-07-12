import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useSavedTrips } from "@/hooks/useSavedTrips.ts";
import { LS_KEYS } from "@/core/lsKeys.ts";
import type { SavedTrip } from "@/core/utils/savedTrips.ts";

function snapshot(name: string, over: Partial<Omit<SavedTrip, "id" | "favorite">> = {}) {
  return {
    name,
    stops: [{ country: name, days: 4, cities: ["A", "B"] }],
    basis: "couple" as const,
    totalDays: 4,
    costPerPerson: "₹1L–₹2L",
    savedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

describe("useSavedTrips", () => {
  beforeEach(() => localStorage.clear());

  it("adds a new trip newest-first and persists it", () => {
    const { result } = renderHook(() => useSavedTrips());
    act(() => result.current.upsert(snapshot("Japan")));
    act(() => result.current.upsert(snapshot("Norway → Denmark")));
    expect(result.current.savedTrips.map((t) => t.name)).toEqual(["Norway → Denmark", "Japan"]);
    const persisted = JSON.parse(localStorage.getItem(LS_KEYS.SAVED_TRIPS) ?? "[]");
    expect(persisted).toHaveLength(2);
    expect(persisted[0].id).toBeTruthy();
  });

  it("updates in place by signature, preserving id, favourite and save time", () => {
    const { result } = renderHook(() => useSavedTrips());
    act(() => result.current.upsert(snapshot("Japan")));
    const firstId = result.current.savedTrips[0].id;
    act(() => result.current.toggleFavorite(firstId));
    act(() => result.current.upsert(snapshot("Japan", { totalDays: 9, savedAt: "2030-01-01T00:00:00.000Z" })));
    expect(result.current.savedTrips).toHaveLength(1);
    const t = result.current.savedTrips[0];
    expect(t.id).toBe(firstId);
    expect(t.favorite).toBe(true);
    expect(t.totalDays).toBe(9);
    expect(t.savedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("removes a trip by id", () => {
    const { result } = renderHook(() => useSavedTrips());
    act(() => result.current.upsert(snapshot("Japan")));
    act(() => result.current.upsert(snapshot("Italy")));
    const id = result.current.savedTrips.find((t) => t.name === "Japan")!.id;
    act(() => result.current.remove(id));
    expect(result.current.savedTrips.map((t) => t.name)).toEqual(["Italy"]);
  });

  it("toggles favourite off again", () => {
    const { result } = renderHook(() => useSavedTrips());
    act(() => result.current.upsert(snapshot("Japan")));
    const id = result.current.savedTrips[0].id;
    act(() => result.current.toggleFavorite(id));
    act(() => result.current.toggleFavorite(id));
    expect(result.current.savedTrips[0].favorite).toBe(false);
  });

  it("toggles favourite by route name", () => {
    const { result } = renderHook(() => useSavedTrips());
    act(() => result.current.upsert(snapshot("Japan")));
    const name = result.current.savedTrips[0].name;
    act(() => result.current.toggleFavoriteByName(name));
    expect(result.current.savedTrips[0].favorite).toBe(true);
    act(() => result.current.toggleFavoriteByName(name));
    expect(result.current.savedTrips[0].favorite).toBe(false);
  });

  it("reloads from localStorage", () => {
    const seeded: SavedTrip[] = [{ ...snapshot("France"), id: "fixed-1" }];
    localStorage.setItem(LS_KEYS.SAVED_TRIPS, JSON.stringify(seeded));
    const { result } = renderHook(() => useSavedTrips());
    act(() => result.current.reload());
    expect(result.current.savedTrips).toHaveLength(1);
    expect(result.current.savedTrips[0].id).toBe("fixed-1");
  });
});
