import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPlanningLinks } from "../utils/planningLinks";

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

  it("uses a lowercase slug for Japan in planning URLs", () => {
    const links = getPlanningLinks("Japan");

    expect(links[1].url).toContain("/japan");
    expect(links[2].url).toContain("/japan/");
  });

  it("uses slug overrides for USA", () => {
    const links = getPlanningLinks("USA");

    expect(links[1].url).toContain("/united-states");
    expect(links[2].url).toContain("/united-states/");
  });

  it("uses hyphenated slugs for South Korea and underscores for Wikivoyage", () => {
    const links = getPlanningLinks("South Korea");

    expect(links[0].url).toContain("/South_Korea");
    expect(links[1].url).toContain("/south-korea");
    expect(links[2].url).toContain("/south-korea/");
  });
});
