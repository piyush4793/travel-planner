import { describe, it, expect } from "vitest";
import { internationalSource } from "@/core/trip/internationalSource.ts";
import { getDestinationSource } from "@/core/trip/getDestinationSource.ts";
import {
  popularDestinations,
  resolvePlannable,
  comboRecommendations,
  dayBoundsFor,
} from "@/core/data/popularDestinations.ts";

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

  it("unions selected units' experiences in first-seen order without duplicates", async () => {
    const single = await internationalSource.experiencesFor(["Norway"]);
    expect(single.length).toBeGreaterThan(0);
    expect(new Set(single).size).toBe(single.length);

    const union = await internationalSource.experiencesFor(["Norway", "Sweden"]);
    expect(new Set(union).size).toBe(union.length);
    // Every tag the first unit offers is present in the multi-unit union.
    for (const exp of single) expect(union).toContain(exp);
  });

  it("ignores unknown units when unioning experiences", async () => {
    const union = await internationalSource.experiencesFor(["Norway", "Nowhereland"]);
    const norway = await internationalSource.experiencesFor(["Norway"]);
    expect(union).toEqual(norway);
  });

  it("loads a plannable unit as a merged country plus rule", async () => {
    const unit = await internationalSource.loadUnit("Norway");
    expect(unit).not.toBeNull();
    expect(unit!.country.name).toBe("Norway");
    expect(unit!.country.cities?.length ?? 0).toBeGreaterThan(0);
    expect(unit!.rule).not.toBeNull();
  });

  it("returns null when loading a unit that isn't plannable", async () => {
    expect(await internationalSource.loadUnit("Nowhereland")).toBeNull();
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
