import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePersistedSet } from "../hooks/usePersistedSet";

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
