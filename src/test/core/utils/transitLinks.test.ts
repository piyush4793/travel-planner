import { describe, it, expect } from "vitest";
import { crossCountryLinks, intercityLinks, qualifyPlace } from "@/core/utils/transitLinks.ts";

describe("transitLinks", () => {
  it("qualifies a place with its country, else leaves it bare", () => {
    expect(qualifyPlace("Bergen", "Norway")).toBe("Bergen, Norway");
    expect(qualifyPlace("Bergen")).toBe("Bergen");
  });

  it("cross-country links lead with flights (fares are dynamic) plus all-modes + directions", () => {
    const links = crossCountryLinks("Bergen, Norway", "Copenhagen, Denmark");
    expect(links.map((l) => l.label)).toEqual(["Search flights", "Compare all routes", "Directions"]);
    expect(links[0].url).toContain("google.com/travel/flights");
    expect(links[1].url).toContain("rome2rio.com/map");
    expect(links[2].url).toContain("maps/dir");
    // Endpoints are URL-encoded into every link.
    expect(links[1].url).toContain(encodeURIComponent("Bergen, Norway"));
    expect(links[1].url).toContain(encodeURIComponent("Copenhagen, Denmark"));
  });

  it("intercity links skip a dedicated flights link (Rome2Rio surfaces those) — just all-modes + directions", () => {
    const links = intercityLinks("Tokyo, Japan", "Kyoto, Japan");
    expect(links.map((l) => l.label)).toEqual(["Compare all routes", "Directions"]);
    expect(links.every((l) => l.url.includes(encodeURIComponent("Tokyo, Japan")))).toBe(true);
  });
});
