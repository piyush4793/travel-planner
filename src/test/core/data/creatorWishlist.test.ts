import { describe, it, expect } from "vitest";
import { creatorWishlistNames } from "@/core/data/creatorWishlist.ts";
import manifestData from "../../../../data/rules/index.json";

type Entry = { name: string; creatorPick?: boolean };

describe("creatorWishlistNames", () => {
  it("returns exactly the manifest entries flagged creatorPick", () => {
    const expected = (manifestData as Entry[]).filter((m) => m.creatorPick).map((m) => m.name);
    expect(creatorWishlistNames()).toEqual(expected);
  });

  it("includes famous curated destinations", () => {
    const names = creatorWishlistNames();
    for (const country of ["Italy", "France", "Japan", "Switzerland", "Thailand"]) {
      expect(names).toContain(country);
    }
  });

  it("returns a non-trivial, de-duplicated set", () => {
    const names = creatorWishlistNames();
    expect(names.length).toBeGreaterThan(10);
    expect(new Set(names).size).toBe(names.length);
  });
});
