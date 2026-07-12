import { describe, it, expect } from "vitest";
import { monthFit, rankByMonthFit } from "@/core/utils/monthFit";
import type { Country } from "@/core/types";

const mk = (name: string, best: string[], worst?: string[]): Country => ({
  name, lat: 0, lng: 0, bestMonths: best, worstMonths: worst, budget: "", experiences: [],
});

describe("monthFit", () => {
  it("returns 'best' when the month is in the ideal window (full or abbrev)", () => {
    const c = mk("A", ["July", "August"]);
    expect(monthFit(c, "Jul")).toBe("best");
    expect(monthFit(c, "July")).toBe("best");
  });

  it("returns 'avoid' when the month is in the avoid window", () => {
    expect(monthFit(mk("A", ["March"], ["July"]), "Jul")).toBe("avoid");
  });

  it("prefers 'best' over 'avoid' when a month appears in both lists", () => {
    expect(monthFit(mk("A", ["July"], ["July"]), "Jul")).toBe("best");
  });

  it("returns 'neutral' when unmentioned or when no month data exists", () => {
    expect(monthFit(mk("A", ["March"]), "Dec")).toBe("neutral");
    expect(monthFit(mk("B", []), "Jul")).toBe("neutral");
  });
});

describe("rankByMonthFit", () => {
  const list = [
    mk("Pop1", ["January"], ["July"]),   // avoid in Jul
    mk("Pop2", ["March"]),                // neutral in Jul
    mk("Pop3", ["July", "August"]),       // best in Jul
    mk("Pop4", ["July"], ["December"]),   // best in Jul
  ];

  it("orders best → neutral → avoid, stable within tier by input order", () => {
    const ranked = rankByMonthFit(list, "Jul").map((c) => c.name);
    expect(ranked).toEqual(["Pop3", "Pop4", "Pop2", "Pop1"]);
  });

  it("returns the list unchanged for a null month", () => {
    expect(rankByMonthFit(list, null).map((c) => c.name)).toEqual(["Pop1", "Pop2", "Pop3", "Pop4"]);
  });
});
