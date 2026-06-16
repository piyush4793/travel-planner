import { describe, it, expect } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useTripStore } from "../hooks/useTripStore";
import { LS_KEYS } from "../core/lsKeys";
import type { Country } from "../core/types";

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
      isCustom: true,
    });

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(LS_KEYS.TRIP_DELETED) ?? "[]")).toContain("Vietnam");
    });
  });

  it("deleteTrip on a customized seed trip removes override and reverts to default", async () => {
    const { result } = renderHook(() => useTripStore(
      ["Vietnam", "Cambodia"],
      [country("Vietnam", ["Cambodia"]), country("Cambodia")],
    ));

    // Customize the seed trip
    act(() => {
      result.current.saveTrip("Vietnam", { main: "Vietnam", addOns: ["Cambodia"], region: "Asia" });
    });
    expect(result.current.mergedTripGroups.find((g) => g.main === "Vietnam")?.isCustom).toBe(true);

    // Delete removes the override — trip reverts to seed defaults
    act(() => {
      result.current.deleteTrip("Vietnam");
    });
    const trip = result.current.mergedTripGroups.find((g) => g.main === "Vietnam");
    expect(trip).toBeDefined();
    expect(trip?.isCustom).toBeFalsy();
  });

  it("deleteTrip removes custom override — seed repopulates the trip", async () => {
    const { result } = renderHook(() => useTripStore(["Brazil"], []));

    // Customize Brazil trip
    act(() => {
      result.current.saveTrip(null, { main: "Brazil", addOns: ["Argentina"], region: "Americas" });
    });
    expect(result.current.mergedTripGroups.find((g) => g.main === "Brazil")?.isCustom).toBe(true);

    // Delete removes override — seed repopulates
    act(() => {
      result.current.deleteTrip("Brazil");
    });

    const trip = result.current.mergedTripGroups.find((g) => g.main === "Brazil");
    expect(trip).toBeDefined();
    expect(trip?.isCustom).toBeFalsy();

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(LS_KEYS.TRIP_CUSTOMS) ?? "[]")).toEqual([]);
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

  it("deleteTrip on an unmodified seed trip is harmless (trip stays from seed)", () => {
    const { result } = renderHook(() => useTripStore(
      ["Vietnam", "Cambodia"],
      [country("Vietnam", ["Cambodia"]), country("Cambodia")],
    ));

    act(() => {
      result.current.deleteTrip("Vietnam");
    });

    // Trip still present — seed data is untouched
    expect(result.current.mergedTripGroups.some((g) => g.main === "Vietnam")).toBe(true);
  });

  it("deleteTrip on custom-only trip removes it permanently", async () => {
    const { result } = renderHook(() => useTripStore([], []));

    act(() => {
      result.current.saveTrip(null, { main: "Custom Trip", addOns: [], region: "Europe" });
    });
    expect(result.current.mergedTripGroups.some((g) => g.main === "Custom Trip")).toBe(true);

    act(() => {
      result.current.deleteTrip("Custom Trip");
    });
    expect(result.current.mergedTripGroups.some((g) => g.main === "Custom Trip")).toBe(false);
  });
});
