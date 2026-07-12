import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePersistedSet } from "@/hooks/usePersistedSet.ts";

describe("usePersistedSet — P0", () => {
  it("initializes from the provided init function", () => {
    const { result } = renderHook(() => usePersistedSet("test_set", () => new Set(["Japan", "Vietnam"])));

    expect([...result.current.set]).toEqual(["Japan", "Vietnam"]);
    expect(JSON.parse(localStorage.getItem("test_set") ?? "[]")).toEqual(["Japan", "Vietnam"]);
  });

  it("add adds a member and persists it", () => {
    const { result } = renderHook(() => usePersistedSet("test_set", () => new Set<string>()));

    act(() => {
      result.current.add("Japan");
    });

    expect([...result.current.set]).toEqual(["Japan"]);
    expect(JSON.parse(localStorage.getItem("test_set") ?? "[]")).toEqual(["Japan"]);
  });

  it("remove removes a member and persists it", () => {
    const { result } = renderHook(() => usePersistedSet("test_set", () => new Set(["Japan", "Vietnam"])));

    act(() => {
      result.current.remove("Japan");
    });

    expect([...result.current.set]).toEqual(["Vietnam"]);
    expect(JSON.parse(localStorage.getItem("test_set") ?? "[]")).toEqual(["Vietnam"]);
  });

  it("toggle adds if not present and removes if present", () => {
    const { result } = renderHook(() => usePersistedSet("test_set", () => new Set(["Japan"])));

    act(() => {
      result.current.toggle("Vietnam");
      result.current.toggle("Japan");
    });

    expect([...result.current.set]).toEqual(["Vietnam"]);
    expect(JSON.parse(localStorage.getItem("test_set") ?? "[]")).toEqual(["Vietnam"]);
  });

  it("persists to localStorage after each change", () => {
    const { result } = renderHook(() => usePersistedSet("test_set", () => new Set(["Japan"])));

    act(() => {
      result.current.add("Vietnam");
    });
    expect(JSON.parse(localStorage.getItem("test_set") ?? "[]")).toEqual(["Japan", "Vietnam"]);

    act(() => {
      result.current.remove("Japan");
    });
    expect(JSON.parse(localStorage.getItem("test_set") ?? "[]")).toEqual(["Vietnam"]);

    act(() => {
      result.current.toggle("Thailand");
    });
    expect(JSON.parse(localStorage.getItem("test_set") ?? "[]")).toEqual(["Vietnam", "Thailand"]);
  });

  it("supports multiple operations with the correct final state", () => {
    const { result } = renderHook(() => usePersistedSet("test_set", () => new Set(["Japan"])));

    act(() => {
      result.current.add("Vietnam");
      result.current.add("Thailand");
      result.current.toggle("Japan");
      result.current.remove("Vietnam");
      result.current.toggle("Cambodia");
    });

    expect([...result.current.set]).toEqual(["Thailand", "Cambodia"]);
    expect(JSON.parse(localStorage.getItem("test_set") ?? "[]")).toEqual(["Thailand", "Cambodia"]);
  });
});

describe("usePersistedSet — cross-tab sync", () => {
  function fireStorage(key: string, newValue: string | null) {
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key, newValue }));
    });
  }

  it("reconciles state when another tab writes the same key", () => {
    const { result } = renderHook(() => usePersistedSet("test_set", () => new Set(["Japan"])));

    fireStorage("test_set", JSON.stringify(["Japan", "Vietnam", "Thailand"]));

    expect([...result.current.set]).toEqual(["Japan", "Vietnam", "Thailand"]);
  });

  it("ignores storage events for other keys", () => {
    const { result } = renderHook(() => usePersistedSet("test_set", () => new Set(["Japan"])));

    fireStorage("other_key", JSON.stringify(["Vietnam"]));

    expect([...result.current.set]).toEqual(["Japan"]);
  });

  it("ignores malformed or non-array payloads", () => {
    const { result } = renderHook(() => usePersistedSet("test_set", () => new Set(["Japan"])));

    fireStorage("test_set", "not-json");
    fireStorage("test_set", JSON.stringify({ not: "an array" }));
    fireStorage("test_set", null);

    expect([...result.current.set]).toEqual(["Japan"]);
  });

  it("does not change reference when incoming value is equal (no ping-pong)", () => {
    const { result } = renderHook(() => usePersistedSet("test_set", () => new Set(["Japan", "Vietnam"])));
    const before = result.current.set;

    fireStorage("test_set", JSON.stringify(["Japan", "Vietnam"]));

    expect(result.current.set).toBe(before);
  });

  it("removes the storage listener on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => usePersistedSet("test_set", () => new Set<string>()));

    unmount();

    expect(removeSpy).toHaveBeenCalledWith("storage", expect.any(Function));
    removeSpy.mockRestore();
  });
});

describe("usePersistedSet — reload (soft refresh)", () => {
  it("re-hydrates the set from localStorage on reload", () => {
    const { result } = renderHook(() => usePersistedSet("reload_set", () => new Set(["Japan"])));

    localStorage.setItem("reload_set", JSON.stringify(["Vietnam", "Thailand"]));
    act(() => { result.current.reload(); });

    expect([...result.current.set]).toEqual(["Vietnam", "Thailand"]);
  });

  it("filters non-string members and tolerates a missing/invalid payload", () => {
    const { result } = renderHook(() => usePersistedSet("reload_set2", () => new Set(["Japan"])));

    localStorage.setItem("reload_set2", JSON.stringify(["Peru", 42, null, "Chile"]));
    act(() => { result.current.reload(); });
    expect([...result.current.set]).toEqual(["Peru", "Chile"]);

    localStorage.setItem("reload_set2", JSON.stringify({ not: "an array" }));
    act(() => { result.current.reload(); });
    expect([...result.current.set]).toEqual([]);
  });
});
