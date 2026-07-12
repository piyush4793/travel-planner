import { describe, it, expect } from "vitest";
import { buildRoute } from "@/core/utils/googleMapsRoute.ts";

describe("buildRoute — P0", () => {
  it("returns null for empty activities", () => {
    expect(buildRoute([], "Tokyo")).toBeNull();
  });

  it("returns null when all activities are generic", () => {
    expect(buildRoute(["Breakfast", "Lunch", "Rest", "Travel day"], "Tokyo")).toBeNull();
  });

  it("builds a valid Google Maps URL with origin and destination", () => {
    const route = buildRoute(
      ["Morning: Visit Senso-ji Temple (₹500)", "Explore Tokyo Skytree — sunset view"],
      "Tokyo",
    );

    expect(route).not.toBeNull();
    expect(route?.url).toBe(
      "https://www.google.com/maps/dir/?api=1&origin=Senso-ji%20Temple%2C%20Tokyo&destination=Tokyo%20Skytree%2C%20Tokyo&travelmode=driving",
    );
  });

  it("maps labels correctly while skipping generic stops", () => {
    const route = buildRoute(
      ["Breakfast", "Visit Senso-ji Temple", "Lunch", "Explore Meiji Shrine", "Rest"],
      "Tokyo",
    );

    expect(route).not.toBeNull();
    expect([...route!.labels.entries()]).toEqual([
      [1, "A"],
      [3, "B"],
    ]);
  });

  it("strips cost parentheticals from stop names", () => {
    const route = buildRoute(["Visit Senso-ji Temple (₹500)"], "Tokyo");

    expect(route?.url).toContain("origin=Senso-ji%20Temple%2C%20Tokyo");
    expect(route?.url).not.toContain("%E2%82%B9500");
  });

  it("strips time-of-day prefixes", () => {
    const route = buildRoute(["Evening - Shibuya Crossing"], "Tokyo");

    expect(route?.url).toContain("origin=Shibuya%20Crossing%2C%20Tokyo");
  });

  it("strips generic verb prefixes", () => {
    const route = buildRoute(["Explore Tokyo Tower"], "Tokyo");

    expect(route?.url).toContain("origin=Tokyo%20Tower%2C%20Tokyo");
  });

  it("uses the same stop for origin and destination when only one routable stop exists", () => {
    const route = buildRoute(["Breakfast", "Visit Tokyo Tower"], "Tokyo");

    expect(route?.url).toBe(
      "https://www.google.com/maps/dir/?api=1&origin=Tokyo%20Tower%2C%20Tokyo&destination=Tokyo%20Tower%2C%20Tokyo&travelmode=driving",
    );
    expect(route?.url).not.toContain("waypoints=");
  });

  it("omits waypoints when there are exactly two routable stops", () => {
    const route = buildRoute(["Visit Tokyo Tower", "Explore Meiji Shrine"], "Tokyo");

    expect(route?.url).not.toContain("waypoints=");
  });

  it("includes waypoints when there are three or more routable stops", () => {
    const route = buildRoute(
      ["Visit Tokyo Tower", "Explore Meiji Shrine", "Walk to Shinjuku Gyoen", "Dinner"],
      "Tokyo",
    );

    expect(route?.url).toContain("&waypoints=Meiji%20Shrine%2C%20Tokyo");
    expect(route?.url).toContain("origin=Tokyo%20Tower%2C%20Tokyo");
    expect(route?.url).toContain("destination=Shinjuku%20Gyoen%2C%20Tokyo");
  });

  describe("transport-leg arrow pattern", () => {
    it("uses the destination after an arrow for the geocodable stop", () => {
      const route = buildRoute(["Ferry Aker Brygge → Bygdøy (10 min, seasonal)"], "Oslo");

      expect(route?.url).toContain("origin=Bygd%C3%B8y%2C%20Oslo");
      expect(route?.url).not.toContain("Brygge");
    });

    it("never leaves an arrow character in the generated URL", () => {
      const route = buildRoute(
        [
          "National Museum — Munch's The Scream",
          "Ferry Aker Brygge → Bygdøy (10 min, seasonal)",
          "Bus 950 Gudvangen → Voss (1 hr) — continue toward Alesund",
        ],
        "Oslo",
      );

      expect(route).not.toBeNull();
      expect(decodeURIComponent(route!.url)).not.toMatch(/[→←⟶⟵➜➔]/);
      expect(route!.url).not.toContain("%E2%86");
    });

    it("strips arrow, mid-leg note, and em-dash detail together", () => {
      const route = buildRoute(
        ["Nærøyfjord electric ferry Flam → Gudvangen (2 hrs) — world's narrowest fjord"],
        "Flam",
      );

      expect(route?.url).toContain("origin=Gudvangen%2C%20Flam");
    });

    it("handles ASCII arrows (->)", () => {
      const route = buildRoute(["Bus A -> Voss (1 hr)"], "Bergen");

      expect(route?.url).toContain("origin=Voss%2C%20Bergen");
    });
  });

  describe("trailing note parentheticals", () => {
    it("strips a non-cost trailing parenthetical like (10 min, seasonal)", () => {
      const route = buildRoute(["Bygdøy Peninsula (10 min, seasonal)"], "Oslo");
      expect(route?.url).toContain("origin=Bygd%C3%B8y%20Peninsula%2C%20Oslo");
    });

    it("strips a duration/detail parenthetical like (free, 1 hr)", () => {
      const route = buildRoute(["Vigeland Sculpture Park (free, 1 hr)"], "Oslo");
      expect(route?.url).toContain("origin=Vigeland%20Sculpture%20Park%2C%20Oslo");
    });

    it("leaves no parenthesis in the generated URL", () => {
      const route = buildRoute(
        ["Akershus Fortress (medieval)", "Oslo Opera House (rooftop walk)"],
        "Oslo",
      );
      expect(decodeURIComponent(route!.url)).not.toMatch(/[()]/);
    });
  });
});
