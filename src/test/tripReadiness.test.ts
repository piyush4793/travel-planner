import { describe, it, expect } from "vitest";
import { tripReadiness, READINESS_ICON } from "../core/utils/tripReadiness";
import type { Country } from "../core/types";

const c = (name: string): Country => ({ name, lat: 0, lng: 0, budget: "", experiences: [], bestMonths: [] });

describe("tripReadiness", () => {
  it("always surfaces an honest per-country visa caveat", () => {
    const items = tripReadiness([c("Norway")]);
    expect(items.some((i) => i.tone === "warn" && /visa rules/i.test(i.text))).toBe(true);
  });

  it("derives a real border-crossing count (stops − 1), singular vs plural", () => {
    expect(tripReadiness([c("A"), c("B")]).some((i) => /1 border crossing/.test(i.text))).toBe(true);
    expect(tripReadiness([c("A"), c("B"), c("C")]).some((i) => /2 border crossings/.test(i.text))).toBe(true);
  });

  it("omits the border line for a single-country trip", () => {
    expect(tripReadiness([c("Norway")]).some((i) => /border/.test(i.text))).toBe(false);
  });

  it("maps every tone to an icon", () => {
    for (const item of tripReadiness([c("A"), c("B")])) {
      expect(READINESS_ICON[item.tone]).toBeTruthy();
    }
  });
});
