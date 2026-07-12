import { describe, it, expect } from "vitest";
import { haversineKm, moveIndex, orderByProximity, type GeoPoint } from "@/core/utils/routeOrder.ts";

describe("haversineKm", () => {
  it("is zero for identical points", () => {
    expect(haversineKm({ lat: 10, lng: 20 }, { lat: 10, lng: 20 })).toBe(0);
  });

  it("grows with separation and is symmetric", () => {
    const a: GeoPoint = { lat: 0, lng: 0 };
    const near: GeoPoint = { lat: 1, lng: 0 };
    const far: GeoPoint = { lat: 10, lng: 0 };
    expect(haversineKm(a, near)).toBeLessThan(haversineKm(a, far));
    expect(haversineKm(a, far)).toBeCloseTo(haversineKm(far, a), 6);
  });
});

describe("orderByProximity", () => {
  it("returns identity for 0 or 1 points", () => {
    expect(orderByProximity([])).toEqual([]);
    expect(orderByProximity([{ lat: 0, lng: 0 }])).toEqual([0]);
  });

  it("chains nearest-neighbour from the start index", () => {
    // A(0) — C(0,10) is nearer than B(0,40); from C, B is next.
    const points: GeoPoint[] = [
      { lat: 0, lng: 0 }, // A
      { lat: 0, lng: 40 }, // B
      { lat: 0, lng: 10 }, // C
    ];
    expect(orderByProximity(points, 0)).toEqual([0, 2, 1]);
  });

  it("honours the start index", () => {
    const points: GeoPoint[] = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 40 },
      { lat: 0, lng: 10 },
    ];
    const order = orderByProximity(points, 1);
    expect(order[0]).toBe(1);
    expect([...order].sort()).toEqual([0, 1, 2]);
  });

  it("falls back to 0 for an out-of-range start", () => {
    const points: GeoPoint[] = [{ lat: 0, lng: 0 }, { lat: 0, lng: 5 }];
    expect(orderByProximity(points, 9)[0]).toBe(0);
  });
});

describe("moveIndex", () => {
  it("moves an item forward, shifting the rest", () => {
    expect(moveIndex([0, 1, 2, 3], 0, 2)).toEqual([1, 2, 0, 3]);
  });

  it("moves an item backward", () => {
    expect(moveIndex(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
  });

  it("returns the same reference for a no-op or out-of-range move", () => {
    const arr = [1, 2, 3];
    expect(moveIndex(arr, 1, 1)).toBe(arr);
    expect(moveIndex(arr, -1, 0)).toBe(arr);
    expect(moveIndex(arr, 0, 5)).toBe(arr);
  });

  it("does not mutate the input", () => {
    const arr = [1, 2, 3];
    moveIndex(arr, 0, 2);
    expect(arr).toEqual([1, 2, 3]);
  });
});
