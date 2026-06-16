import { describe, it, expect } from "vitest";
import { buildMergedTripGroups, type TripGroupDef } from "../core/data/tripGroups";

function findGroup(groups: TripGroupDef[], main: string) {
  return groups.find((group) => group.main === main);
}

describe("buildMergedTripGroups — P0", () => {
  it("returns seed trips when no customs or deleted entries exist", () => {
    const groups = buildMergedTripGroups(
      [],
      [],
      ["Vietnam", "Cambodia", "Thailand"],
      new Map([["Vietnam", ["Cambodia", "Thailand", "Laos"]]]),
    );

    expect(findGroup(groups, "Vietnam")).toEqual({
      main: "Vietnam",
      addOns: ["Cambodia", "Thailand"],
      region: "Asia",
    });
    expect(groups.length).toBeGreaterThan(0);
  });

  it("excludes tombstoned seed trips", () => {
    const groups = buildMergedTripGroups([], ["Vietnam"], ["Vietnam", "Cambodia"], new Map());

    expect(findGroup(groups, "Vietnam")).toBeUndefined();
  });

  it("replaces seed groups with custom overrides", () => {
    const groups = buildMergedTripGroups(
      [{ main: "Vietnam", addOns: ["Japan"], region: "Europe" }],
      [],
      ["Vietnam", "Japan"],
      new Map([["Vietnam", ["Cambodia", "Thailand"]]]),
    );

    expect(findGroup(groups, "Vietnam")).toEqual({
      main: "Vietnam",
      addOns: ["Japan"],
      region: "Europe",
      isCustom: true,
    });
  });

  it("includes user-created groups whose main country is not in seed data", () => {
    const groups = buildMergedTripGroups(
      [{ main: "Brazil", addOns: ["Argentina"], region: "Americas" }],
      [],
      ["Brazil", "Argentina"],
      new Map(),
    );

    expect(findGroup(groups, "Brazil")).toEqual({
      main: "Brazil",
      addOns: ["Argentina"],
      region: "Americas",
      isCustom: true,
    });
  });

  it("filters addOns to valid country names only", () => {
    const groups = buildMergedTripGroups(
      [{ main: "Brazil", addOns: ["Argentina", "Atlantis"], region: "Americas" }],
      [],
      ["Brazil", "Argentina"],
      new Map(),
    );

    expect(findGroup(groups, "Brazil")?.addOns).toEqual(["Argentina"]);
  });

  it("limits addOns to 2 max", () => {
    const groups = buildMergedTripGroups(
      [{ main: "Brazil", addOns: ["Argentina", "Chile", "Peru"], region: "Americas" }],
      [],
      ["Brazil", "Argentina", "Chile", "Peru"],
      new Map(),
    );

    expect(findGroup(groups, "Brazil")?.addOns).toEqual(["Argentina", "Chile"]);
  });

  it("deduplicates duplicate addOns", () => {
    const groups = buildMergedTripGroups(
      [{ main: "Brazil", addOns: ["Argentina", "Argentina", "Chile"], region: "Americas" }],
      [],
      ["Brazil", "Argentina", "Chile"],
      new Map(),
    );

    expect(findGroup(groups, "Brazil")?.addOns).toEqual(["Argentina", "Chile"]);
  });

  it("defaults invalid regions to Asia", () => {
    const groups = buildMergedTripGroups(
      [{ main: "Brazil", addOns: ["Argentina"], region: "Atlantis" as TripGroupDef["region"] }],
      [],
      ["Brazil", "Argentina"],
      new Map(),
    );

    expect(findGroup(groups, "Brazil")?.region).toBe("Asia");
  });

  it("excludes an addOn that matches the main country", () => {
    const groups = buildMergedTripGroups(
      [{ main: "Brazil", addOns: ["Brazil", "Argentina"], region: "Americas" }],
      [],
      ["Brazil", "Argentina"],
      new Map(),
    );

    expect(findGroup(groups, "Brazil")?.addOns).toEqual(["Argentina"]);
  });

  it("marks custom overrides of seed groups as isCustom", () => {
    const groups = buildMergedTripGroups(
      [{ main: "Vietnam", addOns: ["Japan"], region: "Asia" }],
      [],
      ["Vietnam", "Japan"],
      new Map(),
    );

    expect(findGroup(groups, "Vietnam")?.isCustom).toBe(true);
  });

  it("does not mark unmodified seed groups as isCustom", () => {
    const groups = buildMergedTripGroups(
      [],
      [],
      ["Vietnam", "Cambodia"],
      new Map([["Vietnam", ["Cambodia"]]]),
    );

    expect(findGroup(groups, "Vietnam")?.isCustom).toBeUndefined();
  });

  it("does not mutate input customs when marking isCustom", () => {
    const customs = [{ main: "Brazil", addOns: ["Argentina"], region: "Americas" as const }];
    buildMergedTripGroups(customs, [], ["Brazil", "Argentina"], new Map());

    expect((customs[0] as TripGroupDef).isCustom).toBeUndefined();
  });
});
