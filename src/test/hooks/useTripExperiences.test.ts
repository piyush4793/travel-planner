import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useTripExperiences } from "@/hooks/useTripExperiences.ts";
import type { DestinationSource } from "@/core/trip/destinationSource.ts";

function makeSource(
  experiencesFor: DestinationSource["experiencesFor"],
): DestinationSource {
  return {
    scope: "international",
    unitNoun: "country",
    unitNounPlural: "countries",
    popular: () => [],
    resolveUnit: () => null,
    comboRecommendations: () => [],
    dayBounds: () => ({ rec: 7, max: 14 }),
    experiencesFor,
    loadUnit: async () => null,
  };
}

describe("useTripExperiences", () => {
  it("returns an empty list without loading when nothing is selected", () => {
    const source = makeSource(vi.fn());
    const { result } = renderHook(() => useTripExperiences([], source));
    expect(result.current.experiences).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(source.experiencesFor).not.toHaveBeenCalled();
  });

  it("loads the union for the selected units", async () => {
    const source = makeSource(async () => ["Beaches", "Food"]);
    const { result } = renderHook(() => useTripExperiences(["A", "B"], source));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.experiences).toEqual(["Beaches", "Food"]);
  });

  it("ignores a stale resolution when the selection changes mid-flight", async () => {
    let resolveFirst: (v: string[]) => void = () => {};
    const source = makeSource((names) =>
      names[0] === "A"
        ? new Promise<string[]>((r) => { resolveFirst = r; })
        : Promise.resolve(["Fresh"]),
    );
    const { result, rerender } = renderHook(({ names }) => useTripExperiences(names, source), {
      initialProps: { names: ["A"] },
    });
    rerender({ names: ["B"] });
    await waitFor(() => expect(result.current.experiences).toEqual(["Fresh"]));
    // The late first response must not clobber the fresh selection.
    resolveFirst(["Stale"]);
    await Promise.resolve();
    expect(result.current.experiences).toEqual(["Fresh"]);
  });

  it("recovers to an empty list if the source rejects", async () => {
    const source = makeSource(async () => { throw new Error("boom"); });
    const { result } = renderHook(() => useTripExperiences(["A"], source));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.experiences).toEqual([]);
  });
});
