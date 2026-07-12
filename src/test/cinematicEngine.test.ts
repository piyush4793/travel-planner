import { afterEach, describe, expect, it, vi } from "vitest";
import {
  easeInOut,
  roadPt,
  bezierPt,
  calcBearing,
  generateRoadPath,
  generateRailPath,
  cleanJumpOptions,
  buildCityStops,
  buildCinematicRoute,
  buildSingleCountryRoute,
  resolveHomeOrigin,
  interUnitTransport,
  createTransportEl,
  rotateIconToHeading,
  removeTransportMarker,
  rafAnimate,
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

describe("interUnitTransport", () => {
  it("uses flight for far inter-unit hops", () => {
    // Tokyo → Bangkok is thousands of km apart.
    const leg = interUnitTransport([139.7, 35.6], [100.5, 13.7]);
    expect(leg.type).toBe("flight");
  });
  it("uses rail/road for near inter-unit hops", () => {
    const leg = interUnitTransport([2.35, 48.85], [2.4, 48.9]);
    expect(leg.type).toBe("train");
  });
});

describe("resolveHomeOrigin", () => {
  it("resolves a known gateway", () => {
    const o = resolveHomeOrigin("India");
    expect(o.coords).toEqual(HOME_COORDS["India"]);
    expect(o.city).toBe(HOME_CITY["India"]);
    expect(o.label).toBe("India");
  });
  it("falls back to a neutral origin for an unknown home country", () => {
    const o = resolveHomeOrigin("Atlantis");
    expect(o.coords).toEqual([20, 20]);
    expect(o.city).toBe("Atlantis");
  });
});

describe("buildCinematicRoute", () => {
  const jp = {
    name: "Japan",
    lat: 35.68,
    lng: 139.69,
    cities: [
      { name: "Tokyo", lat: 35.68, lng: 139.69 },
      { name: "Kyoto", lat: 35.01, lng: 135.77 },
    ],
  } as unknown as Country;
  const th = {
    name: "Thailand",
    lat: 13.75,
    lng: 100.5,
    cities: [{ name: "Bangkok", lat: 13.75, lng: 100.5 }],
  } as unknown as Country;
  const jpPlan = {
    costPerPerson: "₹1L",
    days: [
      { label: "Day 1 — Tokyo", activities: [] },
      { label: "Day 2 — Kyoto", activities: [] },
    ],
  } as unknown as TripPlan;
  const thPlan = {
    costPerPerson: "₹50K",
    days: [{ label: "Day 1 — Bangkok", activities: [] }],
  } as unknown as TripPlan;

  const seg = (c: Country, plan: TripPlan) => ({
    name: c.name,
    center: [c.cities![0].lng, c.cities![0].lat] as [number, number],
    plan,
    cities: c.cities ?? [],
  });

  it("single-country route matches buildSingleCountryRoute (byte-identical path)", () => {
    const route = buildSingleCountryRoute(jpPlan, jp, null, "India");
    expect(route.title).toBe("Japan");
    expect(route.stops.map((s) => s.name)).toEqual(["Tokyo", "Kyoto"]);
    expect(route.origin?.label).toBe("India");
    // Overview blends origin with the country centroid.
    const home = resolveHomeOrigin("India").coords;
    expect(route.overviewCenter[0]).toBeCloseTo((home[0] + jp.lng) / 2, 6);
  });

  it("composes multiple units and stamps a border hop between them", () => {
    const route = buildCinematicRoute([seg(jp, jpPlan), seg(th, thPlan)], {
      title: "Japan → Thailand",
      plan: jpPlan,
      origin: resolveHomeOrigin("India"),
    });
    expect(route.stops.map((s) => s.name)).toEqual(["Tokyo", "Kyoto", "Bangkok"]);
    // Last stop of Japan bridges to Thailand — a long hop → flight.
    const kyoto = route.stops[1];
    expect(kyoto.transportToNext?.type).toBe("flight");
    // The final stop has no onward leg.
    expect(route.stops[2].transportToNext).toBeUndefined();
  });

  it("supports a domestic-shaped route with no origin (no international arc)", () => {
    const route = buildCinematicRoute([seg(jp, jpPlan)], {
      title: "Japan",
      plan: jpPlan,
      origin: null,
    });
    expect(route.origin).toBeNull();
    // With no origin the overview centers on the units, not a blended midpoint.
    expect(route.overviewCenter).toEqual([jp.cities![0].lng, jp.cities![0].lat]);
  });

  it("skips units whose stops resolve to no coordinates", () => {
    const ghost = {
      name: "Ghostland",
      center: [0, 0] as [number, number],
      plan: { days: [{ label: "Day 1 — Nowhere", activities: [] }] } as unknown as TripPlan,
      cities: [],
    };
    const route = buildCinematicRoute([seg(jp, jpPlan), ghost], {
      title: "Japan",
      plan: jpPlan,
      origin: resolveHomeOrigin("India"),
    });
    expect(route.stops.map((s) => s.name)).toEqual(["Tokyo", "Kyoto"]);
  });
});

describe("createTransportEl", () => {
  it("builds a plane marker with contrails and an SVG icon", () => {
    const el = createTransportEl("✈️");
    expect(el.style.width).toBe("64px");
    expect(el.querySelector(".transport-icon")).toBeTruthy();
    expect(el.querySelector(".plane-contrail")).toBeTruthy();
    expect(el.querySelector(".plane-contrail-glow")).toBeTruthy();
    expect(el.querySelector("svg")).toBeTruthy();
  });

  it("builds a bus marker as a circular orb", () => {
    const el = createTransportEl("🚌");
    expect(el.style.width).toBe("52px");
    expect(el.querySelector(".transport-icon")).toBeTruthy();
    expect(el.querySelector("svg")).toBeTruthy();
  });

  it("builds a ground-vehicle marker with a motion trail", () => {
    const el = createTransportEl("🚗");
    expect(el.style.width).toBe("56px");
    expect(el.querySelector(".ground-motion-trail")).toBeTruthy();
    expect(el.querySelector("svg")).toBeTruthy();
  });

  it("falls back to the emoji glyph when no SVG asset exists", () => {
    const el = createTransportEl("🛸");
    expect(el.querySelector("svg")).toBeNull();
    expect(el.textContent).toContain("🛸");
  });
});

describe("rotateIconToHeading", () => {
  it("applies the screen-relative rotation to the inner icon", () => {
    const el = createTransportEl("🚗");
    const marker = { getElement: () => el } as unknown as import("maplibre-gl").Marker;
    rotateIconToHeading(marker, 90, 30);
    const icon = el.querySelector(".transport-icon") as HTMLElement;
    expect(icon.style.transform).toBe("rotate(60deg)");
  });

  it("no-ops when the marker has no transport-icon", () => {
    const bare = document.createElement("div");
    const marker = { getElement: () => bare } as unknown as import("maplibre-gl").Marker;
    expect(() => rotateIconToHeading(marker, 45, 0)).not.toThrow();
  });
});

describe("removeTransportMarker", () => {
  afterEach(() => vi.useRealTimers());

  it("animates out and removes the marker after the transition", () => {
    vi.useFakeTimers();
    const el = createTransportEl("✈️");
    const remove = vi.fn();
    const marker = { getElement: () => el, remove } as unknown as import("maplibre-gl").Marker;

    removeTransportMarker(marker);
    expect(el.style.transform).toBe("scale(0)");
    expect(el.style.opacity).toBe("0");
    expect(remove).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);
    expect(remove).toHaveBeenCalledTimes(1);
  });
});

describe("rafAnimate", () => {
  it("resolves immediately without progress when cancelled", async () => {
    const onProgress = vi.fn();
    await rafAnimate(1000, onProgress, () => true, () => false);
    expect(onProgress).not.toHaveBeenCalled();
  });

  it("jumps progress to 1 when skipped", async () => {
    const onProgress = vi.fn();
    await rafAnimate(1000, onProgress, () => false, () => false, () => true);
    expect(onProgress).toHaveBeenLastCalledWith(1);
  });

  it("drives progress from 0 to 1 to completion", async () => {
    let now = 0;
    const raf = vi
      .spyOn(globalThis, "requestAnimationFrame")
      .mockImplementation((cb: FrameRequestCallback) => {
        now += 500;
        cb(now);
        return 0 as unknown as number;
      });
    const seen: number[] = [];
    await rafAnimate(1000, (t) => seen.push(t), () => false, () => false);
    expect(seen[seen.length - 1]).toBe(1);
    expect(seen.some((t) => t > 0 && t < 1)).toBe(true);
    raf.mockRestore();
  });
});
