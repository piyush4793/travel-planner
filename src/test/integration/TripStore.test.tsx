import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useCountryStore } from "../../hooks/useCountryStore";
import { useTripStore } from "../../hooks/useTripStore";
import type { TripGroupDef } from "../../core/data/tripGroups";

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
      expect.arrayContaining([expect.objectContaining({ main: "Japan" })]),
    );
  });

  it("saves a custom trip and includes it in mergedTripGroups", async () => {
    const { result } = await renderStores();
    const customTrip: TripGroupDef = { main: "Brazil", addOns: ["Argentina"], region: "Americas" };

    act(() => {
      result.current.saveTrip(null, customTrip);
    });

    expect(result.current.mergedTripGroups).toEqual(
      expect.arrayContaining([expect.objectContaining({ main: "Brazil", addOns: ["Argentina"] })]),
    );
  });

  it("deletes a custom trip from mergedTripGroups", async () => {
    const { result } = await renderStores();
    const customTrip: TripGroupDef = { main: "Brazil", addOns: ["Argentina"], region: "Americas" };

    act(() => {
      result.current.saveTrip(null, customTrip);
    });
    expect(result.current.mergedTripGroups.some((group) => group.main === "Brazil")).toBe(true);

    act(() => {
      result.current.deleteTrip("Brazil");
    });

    expect(result.current.mergedTripGroups.some((group) => group.main === "Brazil")).toBe(false);
  });
});
