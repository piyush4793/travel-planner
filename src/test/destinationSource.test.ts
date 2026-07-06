import { describe, it, expect } from "vitest";
import { internationalSource } from "../core/trip/internationalSource";
import { getDestinationSource } from "../core/trip/getDestinationSource";
import {
  popularDestinations,
  resolvePlannable,
  comboRecommendations,
  dayBoundsFor,
} from "../core/data/popularDestinations";

describe("internationalSource", () => {
  it("exposes the international scope with country unit nouns", () => {
    expect(internationalSource.scope).toBe("international");
    expect(internationalSource.unitNoun).toBe("country");
    expect(internationalSource.unitNounPlural).toBe("countries");
  });

  it("delegates popular/resolveUnit/comboRecommendations to world helpers", () => {
    expect(internationalSource.popular()).toBe(popularDestinations());
    const first = popularDestinations()[0].name;
    expect(internationalSource.resolveUnit(first)).toEqual(resolvePlannable(first));
    expect(internationalSource.resolveUnit("Nowhereland")).toBeNull();
    expect(internationalSource.comboRecommendations(["Norway"]).map((c) => c.name)).toEqual(
      comboRecommendations(["Norway"]).map((c) => c.name),
    );
  });

  it("reports manifest-backed day bounds with rec ≤ max", () => {
    const first = popularDestinations()[0].name;
    const bounds = internationalSource.dayBounds(first);
    expect(bounds).toEqual(dayBoundsFor(first));
    expect(bounds.rec).toBeGreaterThan(0);
    expect(bounds.max).toBeGreaterThanOrEqual(bounds.rec);
  });

  it("falls back to safe day bounds for unknown units", () => {
    expect(dayBoundsFor("Nowhereland")).toEqual({ rec: 7, max: 14 });
  });
});

describe("getDestinationSource", () => {
  it("returns the international source for the international scope", () => {
    expect(getDestinationSource("international")).toBe(internationalSource);
  });

  it("falls back to international for an unregistered scope", () => {
    expect(getDestinationSource("domestic")).toBe(internationalSource);
  });
});
