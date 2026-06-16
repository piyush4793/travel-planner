import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useCountryRule } from "../hooks/useCountryRule";

const {
  hasConsolidatedCountryMock,
  loadConsolidatedCountryMock,
  getCachedConsolidatedCountryMock,
} = vi.hoisted(() => ({
  hasConsolidatedCountryMock: vi.fn(),
  loadConsolidatedCountryMock: vi.fn(),
  getCachedConsolidatedCountryMock: vi.fn(),
}));

vi.mock("../data/consolidatedCountry", () => ({
  fileKey: vi.fn(),
  hasConsolidatedCountry: hasConsolidatedCountryMock,
  loadConsolidatedCountry: loadConsolidatedCountryMock,
  getCachedConsolidatedCountry: getCachedConsolidatedCountryMock,
}));

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const JAPAN_DATA = {
  itinerary: {
    cityOrder: ["Tokyo"],
    cities: {
      Tokyo: { name: "Tokyo", minDays: 2, recDays: 3, maxDays: 4, days: [] },
    },
    connections: [],
  },
};

describe("useCountryRule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasConsolidatedCountryMock.mockReturnValue(true);
    getCachedConsolidatedCountryMock.mockReturnValue(undefined);
    loadConsolidatedCountryMock.mockResolvedValue(null);
  });

  it("returns empty state when country name is missing", () => {
    const { result } = renderHook(() => useCountryRule(undefined));

    expect(result.current).toEqual({
      data: null,
      rule: null,
      loading: false,
    });
  });

  it("returns cached country data without loading", () => {
    getCachedConsolidatedCountryMock.mockReturnValue(JAPAN_DATA);

    const { result } = renderHook(() => useCountryRule("Japan"));

    expect(result.current.data).toEqual(JAPAN_DATA);
    expect(result.current.rule).toEqual(JAPAN_DATA.itinerary);
    expect(result.current.loading).toBe(false);
    expect(loadConsolidatedCountryMock).not.toHaveBeenCalled();
  });

  it("returns null when country has no consolidated file", () => {
    hasConsolidatedCountryMock.mockReturnValue(false);

    const { result } = renderHook(() => useCountryRule("Atlantis"));

    expect(result.current.data).toBeNull();
    expect(result.current.rule).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(loadConsolidatedCountryMock).not.toHaveBeenCalled();
  });

  it("loads data asynchronously and exposes rule once resolved", async () => {
    loadConsolidatedCountryMock.mockResolvedValue(JAPAN_DATA);

    const { result } = renderHook(() => useCountryRule("Japan"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.rule).toEqual(JAPAN_DATA.itinerary);
    });
  });

  it("ignores stale in-flight responses when country changes", async () => {
    const japan = deferred<typeof JAPAN_DATA | null>();
    const franceData = {
      itinerary: {
        cityOrder: ["Paris"],
        cities: {
          Paris: { name: "Paris", minDays: 2, recDays: 3, maxDays: 5, days: [] },
        },
        connections: [],
      },
    };
    const france = deferred<typeof franceData | null>();

    loadConsolidatedCountryMock.mockImplementation((name: string) =>
      name === "Japan" ? japan.promise : france.promise,
    );

    const { result, rerender } = renderHook(({ name }: { name: string | undefined }) => useCountryRule(name), {
      initialProps: { name: "Japan" },
    });

    rerender({ name: "France" });
    japan.resolve(JAPAN_DATA);
    france.resolve(franceData);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.rule?.cityOrder).toEqual(["Paris"]);
    });
  });

  it("returns null and resets loading when loader rejects", async () => {
    loadConsolidatedCountryMock.mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => useCountryRule("Japan"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBeNull();
      expect(result.current.rule).toBeNull();
    });
  });
});
