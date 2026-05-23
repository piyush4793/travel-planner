import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// useHashView reads/writes window.location.hash — mock it
const hashHistory: string[] = [];

beforeEach(() => {
  hashHistory.length = 0;
  Object.defineProperty(window, "location", {
    value: { ...window.location, hash: "" },
    writable: true,
    configurable: true,
  });
});

// Dynamic import so the module picks up our mocked location
async function importHook() {
  // Clear module cache to get fresh module per test
  const mod = await import("../hooks/useHashView");
  return mod;
}

describe("useHashView — P1", () => {
  it("defaults to 'map' when hash is empty", async () => {
    window.location.hash = "";
    const { useHashView } = await importHook();
    const { result } = renderHook(() => useHashView());
    expect(result.current[0]).toBe("map");
  });

  it("parses valid hash into view", async () => {
    window.location.hash = "#calendar";
    const { useHashView } = await importHook();
    const { result } = renderHook(() => useHashView());
    expect(result.current[0]).toBe("calendar");
  });

  it("falls back to 'map' for invalid hash", async () => {
    window.location.hash = "#invalid-view";
    const { useHashView } = await importHook();
    const { result } = renderHook(() => useHashView());
    expect(result.current[0]).toBe("map");
  });

  it("setView updates the current view", async () => {
    window.location.hash = "";
    const { useHashView } = await importHook();
    const { result } = renderHook(() => useHashView());

    act(() => { result.current[1]("trips"); });
    expect(result.current[0]).toBe("trips");
  });

  it("recognizes all 5 valid views", async () => {
    const views = ["map", "calendar", "list", "trips", "discover"];
    const { useHashView } = await importHook();

    for (const v of views) {
      window.location.hash = `#${v}`;
      const { result } = renderHook(() => useHashView());
      expect(result.current[0]).toBe(v);
    }
  });
});
