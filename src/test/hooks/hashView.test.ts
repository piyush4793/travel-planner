import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const hashHistory: string[] = [];

beforeEach(() => {
  hashHistory.length = 0;
  Object.defineProperty(window, "location", {
    value: { ...window.location, hash: "" },
    writable: true,
    configurable: true,
  });
});

async function importHook() {
  const mod = await import("@/hooks/useHashView.ts");
  return mod;
}

describe("useHashView — P1", () => {
  it("defaults to 'plan' when hash is empty", async () => {
    window.location.hash = "";
    const { useHashView } = await importHook();
    const { result } = renderHook(() => useHashView());
    expect(result.current[0]).toBe("plan");
  });

  it("parses valid hash into view", async () => {
    window.location.hash = "#trips";
    const { useHashView } = await importHook();
    const { result } = renderHook(() => useHashView());
    expect(result.current[0]).toBe("trips");
  });

  it("falls back to 'plan' for invalid hash", async () => {
    window.location.hash = "#invalid-view";
    const { useHashView } = await importHook();
    const { result } = renderHook(() => useHashView());
    expect(result.current[0]).toBe("plan");
  });

  it("falls back to 'plan' for removed views (map, list, calendar, discover)", async () => {
    for (const removed of ["map", "list", "calendar", "discover"]) {
      window.location.hash = `#${removed}`;
      const { useHashView } = await importHook();
      const { result } = renderHook(() => useHashView());
      expect(result.current[0]).toBe("plan");
    }
  });

  it("setView updates the current view", async () => {
    window.location.hash = "";
    const { useHashView } = await importHook();
    const { result } = renderHook(() => useHashView());

    act(() => { result.current[1]("trips"); });
    expect(result.current[0]).toBe("trips");
  });

  it("recognizes all valid views", async () => {
    const views = ["plan", "trips"];
    const { useHashView } = await importHook();

    for (const v of views) {
      window.location.hash = `#${v}`;
      const { result } = renderHook(() => useHashView());
      expect(result.current[0]).toBe(v);
    }
  });
});
