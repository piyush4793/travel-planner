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
  const mod = await import("../hooks/useHashView");
  return mod;
}

describe("useHashView — P1", () => {
  it("defaults to 'trips' when hash is empty", async () => {
    window.location.hash = "";
    const { useHashView } = await importHook();
    const { result } = renderHook(() => useHashView());
    expect(result.current[0]).toBe("trips");
  });

  it("parses valid hash into view", async () => {
    window.location.hash = "#calendar";
    const { useHashView } = await importHook();
    const { result } = renderHook(() => useHashView());
    expect(result.current[0]).toBe("calendar");
  });

  it("falls back to 'trips' for invalid hash", async () => {
    window.location.hash = "#invalid-view";
    const { useHashView } = await importHook();
    const { result } = renderHook(() => useHashView());
    expect(result.current[0]).toBe("trips");
  });

  it("falls back to 'trips' for removed views (map, list)", async () => {
    for (const removed of ["map", "list"]) {
      window.location.hash = `#${removed}`;
      const { useHashView } = await importHook();
      const { result } = renderHook(() => useHashView());
      expect(result.current[0]).toBe("trips");
    }
  });

  it("setView updates the current view", async () => {
    window.location.hash = "";
    const { useHashView } = await importHook();
    const { result } = renderHook(() => useHashView());

    act(() => { result.current[1]("discover"); });
    expect(result.current[0]).toBe("discover");
  });

  it("recognizes all 3 valid views", async () => {
    const views = ["trips", "calendar", "discover"];
    const { useHashView } = await importHook();

    for (const v of views) {
      window.location.hash = `#${v}`;
      const { result } = renderHook(() => useHashView());
      expect(result.current[0]).toBe(v);
    }
  });
});
