import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useTripRules } from "../hooks/useTripRules";
import type { DestinationSource, LoadedUnit } from "../core/trip/destinationSource";
import type { Country } from "../core/types";

function unit(name: string): LoadedUnit {
  return { country: { name, lat: 0, lng: 0 } as Country, rule: null };
}

function makeSource(
  loadUnit: DestinationSource["loadUnit"],
): DestinationSource {
  return {
    scope: "international",
    unitNoun: "country",
    unitNounPlural: "countries",
    popular: () => [],
    resolveUnit: () => null,
    comboRecommendations: () => [],
    dayBounds: () => ({ rec: 7, max: 14 }),
    experiencesFor: async () => [],
    loadUnit,
  };
}

describe("useTripRules", () => {
  it("returns an empty list without loading when nothing is selected", () => {
    const source = makeSource(vi.fn());
    const { result } = renderHook(() => useTripRules([], source));
    expect(result.current.units).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(source.loadUnit).not.toHaveBeenCalled();
  });

  it("loads a plan-ready unit per selected name, in order", async () => {
    const source = makeSource(async (name) => unit(name));
    const { result } = renderHook(() => useTripRules(["A", "B"], source));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.units.map((u) => u.country.name)).toEqual(["A", "B"]);
  });

  it("drops units the source can't resolve", async () => {
    const source = makeSource(async (name) => (name === "A" ? unit(name) : null));
    const { result } = renderHook(() => useTripRules(["A", "Nope"], source));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.units.map((u) => u.country.name)).toEqual(["A"]);
  });

  it("ignores a stale resolution when the selection changes mid-flight", async () => {
    let resolveFirst: (v: LoadedUnit | null) => void = () => {};
    const source = makeSource((name) =>
      name === "A"
        ? new Promise<LoadedUnit | null>((r) => { resolveFirst = r; })
        : Promise.resolve(unit(name)),
    );
    const { result, rerender } = renderHook(({ names }) => useTripRules(names, source), {
      initialProps: { names: ["A"] },
    });
    rerender({ names: ["B"] });
    await waitFor(() => expect(result.current.units.map((u) => u.country.name)).toEqual(["B"]));
    resolveFirst(unit("A"));
    await Promise.resolve();
    expect(result.current.units.map((u) => u.country.name)).toEqual(["B"]);
  });

  it("recovers to an empty list if the source rejects", async () => {
    const source = makeSource(async () => { throw new Error("boom"); });
    const { result } = renderHook(() => useTripRules(["A"], source));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.units).toEqual([]);
  });
});
