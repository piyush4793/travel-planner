import { describe, it, expect } from "vitest";
import { setBounded } from "@/utils/boundedCache.ts";

describe("setBounded", () => {
  it("inserts values like a normal Map set below the cap", () => {
    const m = new Map<string, number>();
    setBounded(m, "a", 1, 3);
    setBounded(m, "b", 2, 3);
    expect(m.get("a")).toBe(1);
    expect(m.get("b")).toBe(2);
    expect(m.size).toBe(2);
  });

  it("evicts the oldest entry once the cap is exceeded (FIFO)", () => {
    const m = new Map<string, number>();
    setBounded(m, "a", 1, 2);
    setBounded(m, "b", 2, 2);
    setBounded(m, "c", 3, 2); // exceeds cap → oldest "a" evicted

    expect(m.size).toBe(2);
    expect(m.has("a")).toBe(false);
    expect(m.has("b")).toBe(true);
    expect(m.get("c")).toBe(3);
  });

  it("keeps the map flat across many inserts", () => {
    const m = new Map<number, number>();
    for (let i = 0; i < 1000; i++) setBounded(m, i, i, 50);
    expect(m.size).toBe(50);
    // Only the most recent 50 keys (950..999) survive.
    expect(m.has(999)).toBe(true);
    expect(m.has(950)).toBe(true);
    expect(m.has(949)).toBe(false);
  });

  it("tolerates a stored value that is undefined without corrupting the cap", () => {
    const m = new Map<string, number | undefined>();
    setBounded(m, "x", undefined, 1);
    setBounded(m, "y", 2, 1);
    expect(m.size).toBe(1);
    expect(m.has("y")).toBe(true);
  });
});
