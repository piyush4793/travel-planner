import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePlanScope } from "@/components/views/plan/shell/usePlanScope";
import { loadLS } from "@/core/storage";
import { LS_KEYS } from "@/core/lsKeys";

describe("usePlanScope", () => {
  beforeEach(() => localStorage.clear());

  it("defaults to international when nothing is stored", () => {
    const { result } = renderHook(() => usePlanScope());
    expect(result.current[0]).toBe("international");
  });

  it("prefers the initial (resumed draft) scope over the stored value", () => {
    localStorage.setItem(LS_KEYS.PLAN_SCOPE, JSON.stringify("international"));
    const { result } = renderHook(() => usePlanScope("domestic"));
    expect(result.current[0]).toBe("domestic");
  });

  it("reads a previously stored scope on mount", () => {
    localStorage.setItem(LS_KEYS.PLAN_SCOPE, JSON.stringify("domestic"));
    const { result } = renderHook(() => usePlanScope());
    expect(result.current[0]).toBe("domestic");
  });

  it("persists a scope change so a later mount resumes it", () => {
    const { result } = renderHook(() => usePlanScope());
    act(() => result.current[1]("domestic"));
    expect(result.current[0]).toBe("domestic");
    expect(loadLS<string>(LS_KEYS.PLAN_SCOPE, "international")).toBe("domestic");
  });

  it("ignores a malformed stored value", () => {
    localStorage.setItem(LS_KEYS.PLAN_SCOPE, JSON.stringify("nonsense"));
    const { result } = renderHook(() => usePlanScope());
    expect(result.current[0]).toBe("international");
  });
});
