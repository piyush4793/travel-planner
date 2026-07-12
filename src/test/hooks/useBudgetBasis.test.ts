import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBudgetBasis } from "@/hooks/useBudgetBasis.ts";
import { LS_KEYS } from "@/core/lsKeys.ts";

describe("useBudgetBasis — two-layer basis", () => {
  beforeEach(() => localStorage.clear());

  it("defaults to couple for both layers", () => {
    const { result } = renderHook(() => useBudgetBasis());
    expect(result.current.globalBasis).toBe("couple");
    expect(result.current.activeBasis).toBe("couple");
  });

  it("hydrates the global (and active) from a valid persisted value", () => {
    localStorage.setItem(LS_KEYS.BUDGET_BASIS, JSON.stringify("family4"));
    const { result } = renderHook(() => useBudgetBasis());
    expect(result.current.globalBasis).toBe("family4");
    expect(result.current.activeBasis).toBe("family4");
  });

  it("ignores a corrupt persisted value and falls back to couple", () => {
    localStorage.setItem(LS_KEYS.BUDGET_BASIS, JSON.stringify("group"));
    const { result } = renderHook(() => useBudgetBasis());
    expect(result.current.globalBasis).toBe("couple");
  });

  it("setGlobalBasis persists and resets the active basis to it", () => {
    const { result } = renderHook(() => useBudgetBasis());
    act(() => result.current.setActiveBasis("solo"));
    act(() => result.current.setGlobalBasis("family4"));
    expect(result.current.globalBasis).toBe("family4");
    expect(result.current.activeBasis).toBe("family4");
    expect(JSON.parse(localStorage.getItem(LS_KEYS.BUDGET_BASIS) ?? '""')).toBe("family4");
  });

  it("setActiveBasis is transient and does not persist or change the global", () => {
    const { result } = renderHook(() => useBudgetBasis());
    act(() => result.current.setActiveBasis("solo"));
    expect(result.current.activeBasis).toBe("solo");
    expect(result.current.globalBasis).toBe("couple");
    expect(JSON.parse(localStorage.getItem(LS_KEYS.BUDGET_BASIS) ?? '""')).toBe("couple");
  });
});
