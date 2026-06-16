import { describe, expect, it } from "vitest";
import { fuzzySearchTrips, type Searchable } from "../utils/fuzzySearch";
import type { Country } from "../core/types";

function makeCountry(
  name: string,
  options?: Partial<Country>,
): Country {
  return {
    name,
    lat: 0,
    lng: 0,
    bestMonths: ["January"],
    budget: "₹1L–₹2L",
    experiences: [],
    ...options,
  };
}

function makeTrip(id: number, main: Country, addOns: Country[] = []): Searchable {
  return {
    id,
    main,
    allCountries: [main, ...addOns],
  };
}

describe("fuzzySearchTrips", () => {
  it("prioritizes primary-country prefix matches over combine-country matches", () => {
    const switzerland = makeCountry("Switzerland");
    const germany = makeCountry("Germany", { combo: ["Switzerland"] });
    const austria = makeCountry("Austria", { combo: ["Switzerland"] });

    const results = fuzzySearchTrips(
      [
        makeTrip(1, germany, [austria, switzerland]),
        makeTrip(2, austria, [germany, switzerland]),
        makeTrip(3, switzerland, [germany, austria]),
      ],
      "swit",
    );

    expect(results.map((t) => t.main.name)).toEqual(["Switzerland", "Germany", "Austria"]);
  });

  it("prioritizes word-prefix matches in primary country names", () => {
    const southKorea = makeCountry("South Korea");
    const northKorea = makeCountry("North Korea");
    const koreaTrail = makeCountry("Japan", { combo: ["South Korea", "North Korea"] });

    const results = fuzzySearchTrips(
      [
        makeTrip(1, koreaTrail, [southKorea, northKorea]),
        makeTrip(2, northKorea),
        makeTrip(3, southKorea),
      ],
      "kore",
    );

    expect(results.map((t) => t.main.name)).toEqual(["North Korea", "South Korea", "Japan"]);
  });

  it("normalizes accents for deterministic matching", () => {
    const cote = makeCountry("Cote d Ivoire");
    const czechia = makeCountry("Czech Republic");

    const results = fuzzySearchTrips(
      [makeTrip(1, czechia), makeTrip(2, cote)],
      "côte",
    );

    expect(results.map((t) => t.main.name)).toEqual(["Cote d Ivoire"]);
  });

  it("uses strict fuzzy fallback when deterministic matching finds nothing", () => {
    const switzerland = makeCountry("Switzerland");
    const thailand = makeCountry("Thailand");

    const results = fuzzySearchTrips(
      [makeTrip(1, thailand), makeTrip(2, switzerland)],
      "swizrland",
    );

    expect(results[0]?.main.name).toBe("Switzerland");
  });

  it("matches city prefixes when country names do not match", () => {
    const japan = makeCountry("Japan", {
      cities: [{ name: "Tokyo", lat: 35.6762, lng: 139.6503 }],
    });
    const norway = makeCountry("Norway", {
      cities: [{ name: "Oslo", lat: 59.9139, lng: 10.7522 }],
    });

    const results = fuzzySearchTrips([makeTrip(1, norway), makeTrip(2, japan)], "tok");

    expect(results.map((t) => t.main.name)).toEqual(["Japan"]);
  });
});
