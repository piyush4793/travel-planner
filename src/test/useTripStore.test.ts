import { describe, it, expect } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useTripStore } from "../hooks/useTripStore";
import { LS_KEYS } from "../utils/lsKeys";
import type { Country } from "../types";

function country(name: string, combo?: string[]): Country {
  return {
    name,
    lat: 0,
    lng: 0,
    bestMonths: [],
    budget: "",
    experiences: [],
    ...(combo ? { combo } : {}),
  };
}

describe("useTripStore — P0", () => {
  it("returns seed trip groups when no customs or deleted entries exist", () => {
    const { result } = renderHook(() => useTripStore(
      ["Vietnam", "Cambodia", "Thailand"],
      [country("Vietnam", ["Cambodia", "Thailand"]), country("Cambodia"), country("Thailand")],
    ));

    expect(result.current.mergedTripGroups.some((group) => group.main === "Vietnam")).toBe(true);
    expect(result.current.mergedTripGroups.find((group) => group.main === "Vietnam")?.addOns).toEqual([
      "Cambodia",
      "Thailand",
    ]);
  });

  it("saveTrip adds a new custom trip group", async () => {
    const { result } = renderHook(() => useTripStore([], []));

    act(() => {
      result.current.saveTrip(null, { main: "Brazil", addOns: ["Argentina"], region: "Americas" });
    });

    expect(result.current.mergedTripGroups.some((group) => group.main === "Brazil")).toBe(true);

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(LS_KEYS.TRIP_CUSTOMS) ?? "[]")).toEqual([
        { main: "Brazil", addOns: ["Argentina"], region: "Americas" },
      ]);
    });
  });

  it("saveTrip with rename tombstones the old seed name", async () => {
    const { result } = renderHook(() => useTripStore(
      ["Vietnam", "Japan", "China"],
      [country("Vietnam", ["Cambodia"]), country("Japan", ["China"]), country("China")],
    ));

    act(() => {
      result.current.saveTrip("Vietnam", { main: "Japan", addOns: ["China"], region: "Asia" });
    });

    expect(result.current.mergedTripGroups.some((group) => group.main === "Vietnam")).toBe(false);
    expect(result.current.mergedTripGroups.find((group) => group.main === "Japan")).toEqual({
      main: "Japan",
      addOns: ["China"],
      region: "Asia",
    });

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(LS_KEYS.TRIP_DELETED) ?? "[]")).toContain("Vietnam");
    });
  });

  it("deleteTrip tombstones seed trips", async () => {
    const { result } = renderHook(() => useTripStore(
      ["Vietnam", "Cambodia"],
      [country("Vietnam", ["Cambodia"]), country("Cambodia")],
    ));

    act(() => {
      result.current.deleteTrip("Vietnam");
    });

    expect(result.current.mergedTripGroups.some((group) => group.main === "Vietnam")).toBe(false);

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(LS_KEYS.TRIP_DELETED) ?? "[]")).toContain("Vietnam");
    });
  });

  it("deleteTrip removes non-seed custom trips from customs", async () => {
    const { result } = renderHook(() => useTripStore([], []));

    act(() => {
      result.current.saveTrip(null, { main: "Brazil", addOns: ["Argentina"], region: "Americas" });
    });
    act(() => {
      result.current.deleteTrip("Brazil");
    });

    expect(result.current.mergedTripGroups.some((group) => group.main === "Brazil")).toBe(false);

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(LS_KEYS.TRIP_CUSTOMS) ?? "[]")).toEqual([]);
      expect(JSON.parse(localStorage.getItem(LS_KEYS.TRIP_DELETED) ?? "[]")).toEqual([]);
    });
  });

  it("recomputes merged trip groups when myListNames or countries change", () => {
    const { result, rerender } = renderHook(
      ({ names, countries }: { names: string[]; countries: Country[] }) => useTripStore(names, countries),
      {
        initialProps: {
          names: ["Vietnam"],
          countries: [country("Vietnam", ["Cambodia", "Thailand"]), country("Cambodia"), country("Thailand")],
        },
      },
    );

    expect(result.current.mergedTripGroups.find((group) => group.main === "Vietnam")?.addOns).toEqual([]);

    rerender({
      names: ["Vietnam", "Cambodia", "Thailand"],
      countries: [country("Vietnam", ["Cambodia", "Thailand"]), country("Cambodia"), country("Thailand")],
    });

    expect(result.current.mergedTripGroups.find((group) => group.main === "Vietnam")?.addOns).toEqual([
      "Cambodia",
      "Thailand",
    ]);
  });
});
