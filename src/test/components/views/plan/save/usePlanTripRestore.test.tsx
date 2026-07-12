import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { Country } from "@/core/types";
import type { OpenTripRequest } from "@/core/utils/savedTrips";
import { usePlanTripRestore } from "@/components/views/plan/save/usePlanTripRestore";

function mk(name: string): Country {
  return { name, lat: 0, lng: 0, bestMonths: [], budget: "₹1L", experiences: [] };
}

const CATALOG: Record<string, Country> = {
  Japan: mk("Japan"),
  Thailand: mk("Thailand"),
};
const resolveCountry = (name: string): Country | null => CATALOG[name] ?? null;

function baseParams(overrides: Partial<Parameters<typeof usePlanTripRestore>[0]> = {}) {
  return {
    countries: Object.values(CATALOG),
    resolveCountry,
    openTrip: null as OpenTripRequest | null,
    startNewNonce: undefined as number | undefined,
    matchSavedTrip: undefined,
    onRecordPlanned: vi.fn(),
    setSelection: vi.fn(),
    setStepIndex: vi.fn(),
    setBudgetBasis: vi.fn(),
    scope: "international" as const,
    setScope: vi.fn(),
    ...overrides,
  };
}

const openReq: OpenTripRequest = {
  nonce: 1,
  basis: "couple",
  stops: [
    { country: "Japan", days: 6, cities: ["Tokyo", "Kyoto"], experiences: ["Food"] },
    { country: "Thailand", days: 4, cities: ["Bangkok"], experiences: ["Beaches"] },
  ],
};

describe("usePlanTripRestore", () => {
  it("reopens a saved route: reseeds selection, jumps to Review, restores basis + seeds", () => {
    const params = baseParams({ openTrip: openReq });
    const { result } = renderHook((p) => usePlanTripRestore(p), { initialProps: params });

    expect(params.setSelection).toHaveBeenCalledWith([CATALOG.Japan, CATALOG.Thailand]);
    expect(params.setStepIndex).toHaveBeenCalledWith(2);
    expect(params.setBudgetBasis).toHaveBeenCalledWith("couple");
    expect(params.onRecordPlanned).toHaveBeenCalledWith(["Japan", "Thailand"]);
    expect(result.current.reopenedRef.current).toBe(true);

    // Primary seed = first stop; trip seed = the rest keyed by country.
    expect(result.current.primarySeed).toEqual({ nonce: 1, cities: ["Tokyo", "Kyoto"], days: 6, experiences: ["Food"] });
    expect(result.current.tripSeed).toEqual({
      nonce: 1,
      byCountry: { Thailand: { cities: ["Bangkok"], days: 4, experiences: ["Beaches"] } },
    });
  });

  it("aligns scope to the saved trip before resolving, then applies", () => {
    // A domestic trip reopened while the wizard is in international scope: the
    // hook must switch scope first (so the domestic source can resolve the state
    // names) and defer applying until scope matches. Modelled with a scoped
    // resolver that only resolves when the active scope is domestic.
    const domesticReq: OpenTripRequest = {
      nonce: 5,
      basis: "solo",
      scope: "domestic",
      stops: [{ country: "Rajasthan", days: 6, cities: ["Jaipur"], experiences: ["History"] }],
    };
    const rajasthan = mk("Rajasthan");
    const setScope = vi.fn();
    const intlParams = baseParams({
      openTrip: domesticReq,
      scope: "international",
      setScope,
      // International scope can't resolve the state name.
      resolveCountry: () => null,
    });
    const { rerender } = renderHook((p) => usePlanTripRestore(p), { initialProps: intlParams });
    // First pass: scope mismatch → request the switch, do not apply yet.
    expect(setScope).toHaveBeenCalledWith("domestic");
    expect(intlParams.setSelection).not.toHaveBeenCalled();

    // Re-render as if the scope switched and the domestic source now resolves.
    const domesticParams = baseParams({
      openTrip: domesticReq,
      scope: "domestic",
      setScope,
      resolveCountry: (n: string) => (n === "Rajasthan" ? rajasthan : null),
    });
    rerender(domesticParams);
    expect(domesticParams.setSelection).toHaveBeenCalledWith([rajasthan]);
    expect(domesticParams.setStepIndex).toHaveBeenCalledWith(2);
  });

  it("applies an open request exactly once per nonce", () => {
    const params = baseParams({ openTrip: openReq });
    const { rerender } = renderHook((p) => usePlanTripRestore(p), { initialProps: params });
    expect(params.setSelection).toHaveBeenCalledTimes(1);

    // A re-render with the same nonce must not re-apply (idempotent per nonce).
    rerender({ ...params });
    expect(params.setSelection).toHaveBeenCalledTimes(1);
  });

  it("does not stamp the nonce until the stops resolve to live countries", () => {
    const unknown: OpenTripRequest = { ...openReq, nonce: 9, stops: [{ country: "Narnia", days: 3, cities: [], experiences: [] }] };
    const params = baseParams({ openTrip: unknown });
    const { result } = renderHook((p) => usePlanTripRestore(p), { initialProps: params });
    expect(params.setSelection).not.toHaveBeenCalled();
    expect(result.current.reopenedRef.current).toBe(false);
    expect(result.current.primarySeed).toBeNull();
  });

  it("resets the funnel when startNewNonce bumps", () => {
    const params = baseParams({ openTrip: openReq, startNewNonce: 0 });
    const { result, rerender } = renderHook((p) => usePlanTripRestore(p), { initialProps: params });
    expect(result.current.primarySeed).not.toBeNull();

    act(() => rerender({ ...params, startNewNonce: 1 }));
    expect(params.setSelection).toHaveBeenLastCalledWith([]);
    expect(params.setStepIndex).toHaveBeenLastCalledWith(0);
    expect(result.current.primarySeed).toBeNull();
    expect(result.current.tripSeed).toBeNull();
  });

  it("starts a fresh plan when the picked set has no saved match", async () => {
    const params = baseParams({ matchSavedTrip: () => null });
    const { result } = renderHook((p) => usePlanTripRestore(p), { initialProps: params });

    await act(async () => {
      await result.current.handleStartSelection([CATALOG.Japan]);
    });
    expect(params.setSelection).toHaveBeenCalledWith([CATALOG.Japan]);
    expect(params.setStepIndex).toHaveBeenCalledWith(0);
    expect(params.onRecordPlanned).toHaveBeenCalledWith(["Japan"]);
  });
});
