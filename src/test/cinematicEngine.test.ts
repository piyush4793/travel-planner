import { describe, expect, it } from "vitest";
import {
  easeInOut,
  roadPt,
  bezierPt,
  calcBearing,
  generateRoadPath,
  generateRailPath,
  cleanJumpOptions,
  buildCityStops,
  HOME_COORDS,
  HOME_CITY,
} from "../components/country/cinematic/engine";
import type { TripPlan } from "../core/utils/tripPlans";
import type { Country } from "../core/types";

describe("easeInOut", () => {
  it("pins endpoints and midpoint", () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.5)).toBeCloseTo(0.5, 6);
  });

  it("is monotonic and symmetric around 0.5", () => {
    expect(easeInOut(0.25) + easeInOut(0.75)).toBeCloseTo(1, 6);
    expect(easeInOut(0.25)).toBeLessThan(easeInOut(0.75));
  });
});

describe("roadPt", () => {
  const path: [number, number][] = [
    [0, 0],
    [10, 0],
    [10, 10],
  ];
  it("returns endpoints at 0 and 1", () => {
    expect(roadPt(path, 0)).toEqual([0, 0]);
    expect(roadPt(path, 1)).toEqual([10, 10]);
  });
  it("interpolates within a segment", () => {
    expect(roadPt(path, 0.25)).toEqual([5, 0]);
  });
});

describe("bezierPt", () => {
  it("returns control endpoints at t=0 and t=1", () => {
    const p0: [number, number] = [0, 0];
    const p1: [number, number] = [5, 10];
    const p2: [number, number] = [10, 0];
    expect(bezierPt(p0, p1, p2, 0)).toEqual(p0);
    expect(bezierPt(p0, p1, p2, 1)).toEqual(p2);
  });
  it("bulges toward the control point at the midpoint", () => {
    const mid = bezierPt([0, 0], [5, 10], [10, 0], 0.5);
    expect(mid[0]).toBeCloseTo(5, 6);
    expect(mid[1]).toBeCloseTo(5, 6);
  });
});

describe("calcBearing", () => {
  it("points east (~90°) and north (~0°)", () => {
    expect(calcBearing([0, 0], [1, 0])).toBeCloseTo(90, 0);
    expect(calcBearing([0, 0], [0, 1])).toBeCloseTo(0, 0);
  });
  it("always returns a value within [0, 360)", () => {
    const b = calcBearing([10, 10], [-5, -20]);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(360);
  });
});

describe("path generators", () => {
  const from: [number, number] = [0, 0];
  const to: [number, number] = [10, 10];
  it("generateRoadPath yields steps+1 points anchored at the ends", () => {
    const p = generateRoadPath(from, to, 20);
    expect(p).toHaveLength(21);
    expect(p[0]).toEqual(from);
    expect(p[20][0]).toBeCloseTo(to[0], 6);
    expect(p[20][1]).toBeCloseTo(to[1], 6);
  });
  it("generateRailPath yields steps+1 points anchored at the ends", () => {
    const p = generateRailPath(from, to, 12);
    expect(p).toHaveLength(13);
    expect(p[0]).toEqual(from);
    expect(p[12][0]).toBeCloseTo(to[0], 6);
    expect(p[12][1]).toBeCloseTo(to[1], 6);
  });
});

describe("cleanJumpOptions", () => {
  it("keeps defined camera keys", () => {
    const out = cleanJumpOptions({ center: [10, 20], zoom: 1.8, bearing: 30, pitch: 40 });
    expect(out).toEqual({ center: [10, 20], zoom: 1.8, bearing: 30, pitch: 40 });
  });
  it("drops undefined keys so MapLibre never receives NaN", () => {
    const out = cleanJumpOptions({ center: [1, 2], zoom: 9 });
    expect(out).toEqual({ center: [1, 2], zoom: 9 });
    expect("bearing" in out).toBe(false);
    expect("pitch" in out).toBe(false);
  });
});

describe("home departure tables", () => {
  it("HOME_COORDS and HOME_CITY cover the same countries", () => {
    expect(Object.keys(HOME_COORDS).sort()).toEqual(Object.keys(HOME_CITY).sort());
  });
});

describe("buildCityStops", () => {
  const country = {
    name: "Testland",
    cities: [
      { name: "Alpha", lat: 1, lng: 2 },
      { name: "Beta", lat: 3, lng: 4 },
    ],
  } as unknown as Country;

  const plan = {
    days: [
      { label: "Day 1 — Alpha", activities: [] },
      { label: "Day 2 — Alpha", activities: [] },
      { label: "Day 3 — Beta", activities: [] },
    ],
  } as unknown as TripPlan;

  it("groups consecutive same-city days and maps coordinates", () => {
    const stops = buildCityStops(plan, country);
    expect(stops).toHaveLength(2);
    expect(stops[0].name).toBe("Alpha");
    expect(stops[0].days).toHaveLength(2);
    expect(stops[0].coords).toEqual([2, 1]);
    expect(stops[1].name).toBe("Beta");
    expect(stops[1].coords).toEqual([4, 3]);
  });

  it("drops cities without coordinates", () => {
    const p = { days: [{ label: "Day 1 — Ghost", activities: [] }] } as unknown as TripPlan;
    expect(buildCityStops(p, country)).toHaveLength(0);
  });
});
