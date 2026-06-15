import { describe, it, expect } from "vitest";
import { buildRoute } from "../utils/googleMapsRoute";

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
});
