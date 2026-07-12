import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPlanningLinks } from "@/utils/planningLinks.ts";

describe("planningLinks — P0", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("returns 3 planning links for Japan", () => {
    expect(getPlanningLinks("Japan")).toHaveLength(3);
  });

  it("returns links with emoji, label, url, and description", () => {
    const links = getPlanningLinks("Japan");

    links.forEach((link) => {
      expect(link.emoji).toBeTruthy();
      expect(link.label).toBeTruthy();
      expect(link.url).toBeTruthy();
      expect(link.description).toBeTruthy();
    });
  });

  it("uses a lowercase slug for Japan in the Lonely Planet URL", () => {
    const links = getPlanningLinks("Japan");

    expect(links[1].url).toContain("/japan");
  });

  it("uses slug overrides for USA in the Lonely Planet URL", () => {
    const links = getPlanningLinks("USA");

    expect(links[1].url).toContain("/united-states");
  });

  it("uses hyphenated slugs for South Korea and underscores for Wikivoyage", () => {
    const links = getPlanningLinks("South Korea");

    expect(links[0].url).toContain("/South_Korea");
    expect(links[1].url).toContain("/south-korea");
  });

  it("builds the visa link as a home-country-aware Google search", () => {
    const visa = getPlanningLinks("Japan", "India")[2];

    expect(visa.url).toBe(
      `https://www.google.com/search?q=${encodeURIComponent("India passport visa requirements for Japan")}`,
    );
    expect(visa.description).toContain("India");
    expect(visa.description).toContain("Japan");
  });

  it("falls back to a destination-only visa query when no home country is given", () => {
    const visa = getPlanningLinks("Japan")[2];

    expect(visa.url).toBe(
      `https://www.google.com/search?q=${encodeURIComponent("Japan visa & entry requirements")}`,
    );
    expect(visa.description).not.toContain("passport");
  });

  it("ignores a blank home country for the visa query", () => {
    const visa = getPlanningLinks("Japan", "   ")[2];

    expect(visa.url).toContain(encodeURIComponent("Japan visa & entry requirements"));
  });
});
