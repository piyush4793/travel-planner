import { describe, it, expect } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useTripStore } from "../hooks/useTripStore";
import { LS_KEYS } from "../core/lsKeys";
import type { Country } from "../core/types";

const COUNTRY = {
  VIETNAM: "Vietnam",
  CAMBODIA: "Cambodia",
  THAILAND: "Thailand",
  BRAZIL: "Brazil",
  ARGENTINA: "Argentina",
  JAPAN: "Japan",
  CHINA: "China",
  CUSTOM: "Custom Trip",
} as const;

const REGION = {
  ASIA: "Asia",
  AMERICAS: "Americas",
  EUROPE: "Europe",
} as const;

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
      [COUNTRY.VIETNAM, COUNTRY.CAMBODIA, COUNTRY.THAILAND],
      [country(COUNTRY.VIETNAM, [COUNTRY.CAMBODIA, COUNTRY.THAILAND]), country(COUNTRY.CAMBODIA), country(COUNTRY.THAILAND)],
    ));

    expect(result.current.mergedTripGroups.some((group) => group.main === COUNTRY.VIETNAM)).toBe(true);
    expect(result.current.mergedTripGroups.find((group) => group.main === COUNTRY.VIETNAM)?.addOns).toEqual([
      COUNTRY.CAMBODIA,
      COUNTRY.THAILAND,
    ]);
  });

  it("saveTrip adds a new custom trip group", async () => {
    const { result } = renderHook(() => useTripStore([], []));

    act(() => {
      result.current.saveTrip(null, { main: COUNTRY.BRAZIL, addOns: [COUNTRY.ARGENTINA], region: REGION.AMERICAS });
    });

    expect(result.current.mergedTripGroups.some((group) => group.main === COUNTRY.BRAZIL)).toBe(true);

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(LS_KEYS.TRIP_CUSTOMS) ?? "[]")).toEqual([
        { main: COUNTRY.BRAZIL, addOns: [COUNTRY.ARGENTINA], region: REGION.AMERICAS },
      ]);
    });
  });

  it("saveTrip with rename tombstones the old seed name", async () => {
    const { result } = renderHook(() => useTripStore(
      [COUNTRY.VIETNAM, COUNTRY.JAPAN, COUNTRY.CHINA],
      [country(COUNTRY.VIETNAM, [COUNTRY.CAMBODIA]), country(COUNTRY.JAPAN, [COUNTRY.CHINA]), country(COUNTRY.CHINA)],
    ));

    act(() => {
      result.current.saveTrip(COUNTRY.VIETNAM, { main: COUNTRY.JAPAN, addOns: [COUNTRY.CHINA], region: REGION.ASIA });
    });

    expect(result.current.mergedTripGroups.some((group) => group.main === COUNTRY.VIETNAM)).toBe(false);
    expect(result.current.mergedTripGroups.find((group) => group.main === COUNTRY.JAPAN)).toEqual({
      main: COUNTRY.JAPAN,
      addOns: [COUNTRY.CHINA],
      region: REGION.ASIA,
      isCustom: true,
    });

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(LS_KEYS.TRIP_DELETED) ?? "[]")).toContain(COUNTRY.VIETNAM);
    });
  });

  it("deleteTrip on a customized seed trip removes override and reverts to default", async () => {
    const { result } = renderHook(() => useTripStore(
      [COUNTRY.VIETNAM, COUNTRY.CAMBODIA],
      [country(COUNTRY.VIETNAM, [COUNTRY.CAMBODIA]), country(COUNTRY.CAMBODIA)],
    ));

    // Customize the seed trip
    act(() => {
      result.current.saveTrip(COUNTRY.VIETNAM, { main: COUNTRY.VIETNAM, addOns: [COUNTRY.CAMBODIA], region: REGION.ASIA });
    });
    expect(result.current.mergedTripGroups.find((g) => g.main === COUNTRY.VIETNAM)?.isCustom).toBe(true);

    // Delete removes the override — trip reverts to seed defaults
    act(() => {
      result.current.deleteTrip(COUNTRY.VIETNAM);
    });
    const trip = result.current.mergedTripGroups.find((g) => g.main === COUNTRY.VIETNAM);
    expect(trip).toBeDefined();
    expect(trip?.isCustom).toBeFalsy();
  });

  it("deleteTrip removes custom override — seed repopulates the trip", async () => {
    const { result } = renderHook(() => useTripStore(["Brazil"], []));

    // Customize Brazil trip
    act(() => {
      result.current.saveTrip(null, { main: COUNTRY.BRAZIL, addOns: [COUNTRY.ARGENTINA], region: REGION.AMERICAS });
    });
    expect(result.current.mergedTripGroups.find((g) => g.main === COUNTRY.BRAZIL)?.isCustom).toBe(true);

    // Delete removes override — seed repopulates
    act(() => {
      result.current.deleteTrip(COUNTRY.BRAZIL);
    });

    const trip = result.current.mergedTripGroups.find((g) => g.main === COUNTRY.BRAZIL);
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
          names: [COUNTRY.VIETNAM] as string[],
          countries: [country(COUNTRY.VIETNAM, [COUNTRY.CAMBODIA, COUNTRY.THAILAND]), country(COUNTRY.CAMBODIA), country(COUNTRY.THAILAND)],
        },
      },
    );

    expect(result.current.mergedTripGroups.find((group) => group.main === COUNTRY.VIETNAM)?.addOns).toEqual([]);

    rerender({
      names: [COUNTRY.VIETNAM, COUNTRY.CAMBODIA, COUNTRY.THAILAND] as string[],
      countries: [country(COUNTRY.VIETNAM, [COUNTRY.CAMBODIA, COUNTRY.THAILAND]), country(COUNTRY.CAMBODIA), country(COUNTRY.THAILAND)],
    });

    expect(result.current.mergedTripGroups.find((group) => group.main === COUNTRY.VIETNAM)?.addOns).toEqual([
      COUNTRY.CAMBODIA,
      COUNTRY.THAILAND,
    ]);
  });

  it("deleteTrip on an unmodified seed trip is harmless (trip stays from seed)", () => {
    const { result } = renderHook(() => useTripStore(
      [COUNTRY.VIETNAM, COUNTRY.CAMBODIA],
      [country(COUNTRY.VIETNAM, [COUNTRY.CAMBODIA]), country(COUNTRY.CAMBODIA)],
    ));

    act(() => {
      result.current.deleteTrip(COUNTRY.VIETNAM);
    });

    // Trip still present — seed data is untouched
    expect(result.current.mergedTripGroups.some((g) => g.main === COUNTRY.VIETNAM)).toBe(true);
  });

  it("deleteTrip on custom-only trip removes it permanently", async () => {
    const { result } = renderHook(() => useTripStore([], []));

    act(() => {
      result.current.saveTrip(null, { main: COUNTRY.CUSTOM, addOns: [], region: REGION.EUROPE });
    });
    expect(result.current.mergedTripGroups.some((g) => g.main === COUNTRY.CUSTOM)).toBe(true);

    act(() => {
      result.current.deleteTrip(COUNTRY.CUSTOM);
    });
    expect(result.current.mergedTripGroups.some((g) => g.main === COUNTRY.CUSTOM)).toBe(false);
  });
});
