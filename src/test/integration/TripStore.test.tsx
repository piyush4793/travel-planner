import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useCountryStore } from "../../hooks/useCountryStore";
import { useTripStore } from "../../hooks/useTripStore";
import type { TripGroupDef } from "../../core/data/tripGroups";

const COUNTRY = {
  JAPAN: "Japan",
  BRAZIL: "Brazil",
  ARGENTINA: "Argentina",
} as const;

const REGION = {
  AMERICAS: "Americas",
} as const;

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

async function renderStores() {
  const hook = renderHook(() => {
    const countryStore = useCountryStore();
    const tripStore = useTripStore(countryStore.myListNames, countryStore.myListCountries);
    return { ...countryStore, ...tripStore };
  });

  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

  return hook;
}

describe("useTripStore integration", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("returns merged seed trip groups", async () => {
    const { result } = await renderStores();

    expect(result.current.mergedTripGroups.length).toBeGreaterThan(0);
    expect(result.current.mergedTripGroups).toEqual(
      expect.arrayContaining([expect.objectContaining({ main: COUNTRY.JAPAN })]),
    );
  });

  it("saves a custom trip and includes it in mergedTripGroups", async () => {
    const { result } = await renderStores();
    const customTrip: TripGroupDef = { main: COUNTRY.BRAZIL, addOns: [COUNTRY.ARGENTINA], region: REGION.AMERICAS };

    act(() => {
      result.current.addToList(COUNTRY.ARGENTINA);
    });
    act(() => {
      result.current.saveTrip(null, customTrip);
    });

    expect(result.current.mergedTripGroups).toEqual(
      expect.arrayContaining([expect.objectContaining({ main: COUNTRY.BRAZIL, addOns: [COUNTRY.ARGENTINA] })]),
    );
  });

  it("deletes a custom override and reverts to seed trip", async () => {
    const { result } = await renderStores();
    const customTrip: TripGroupDef = { main: COUNTRY.BRAZIL, addOns: [COUNTRY.ARGENTINA], region: REGION.AMERICAS };

    act(() => {
      result.current.saveTrip(null, customTrip);
    });
    expect(result.current.mergedTripGroups.find((g) => g.main === COUNTRY.BRAZIL)?.isCustom).toBe(true);

    act(() => {
      result.current.deleteTrip(COUNTRY.BRAZIL);
    });

    // Trip still exists (from seed), but no longer marked custom
    const trip = result.current.mergedTripGroups.find((g) => g.main === COUNTRY.BRAZIL);
    expect(trip).toBeDefined();
    expect(trip?.isCustom).toBeFalsy();
  });
});
