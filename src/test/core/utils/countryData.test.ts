import { describe, it, expect } from "vitest";
import { consolidatedToCountry, mergeCountryData } from "@/core/utils/countryData.ts";
import type { Country } from "@/core/types.ts";
import type { ConsolidatedCountry } from "@/data/consolidatedCountry.ts";

const CONSOLIDATED: ConsolidatedCountry = {
  name: "Sri Lanka",
  seed: false,
  lat: 7.8731,
  lng: 80.7718,
  region: "Asia",
  bestMonths: ["January", "February"],
  worstMonths: ["May"],
  budget: { solo: "₹60K", couple: "₹1L", family4: "₹2L" },
  experiences: ["Beaches", "Tea country", "Wildlife"],
  avoid: ["Monsoon flooding"],
  combo: ["India", "Maldives"],
  landmark: "Sigiriya",
  travelStyle: ["explorer"],
  stopoverNote: "Great add-on to South India",
  links: [{ label: "Tourism", url: "https://example.com" }],
  cities: [{ name: "Colombo", lat: 6.9, lng: 79.8 }],
  itinerary: null,
};

const MINIMAL_STUB: Country = {
  name: "Sri Lanka",
  lat: 7.8731,
  lng: 80.7718,
  bestMonths: [],
  budget: "",
  experiences: [],
};

describe("consolidatedToCountry", () => {
  it("maps the couple budget and full detail fields", () => {
    const c = consolidatedToCountry(CONSOLIDATED, 42);
    expect(c.budget).toBe("₹1L");
    expect(c.budgetBreakdown).toEqual({ solo: "₹60K", couple: "₹1L", family4: "₹2L" });
    expect(c.experiences).toEqual(["Beaches", "Tea country", "Wildlife"]);
    expect(c.combo).toEqual(["India", "Maldives"]);
    expect(c.landmark).toBe("Sigiriya");
    expect(c.popularityScore).toBe(42);
  });

  it("derives per-city experiences from notes and itinerary content", () => {
    const withRule: ConsolidatedCountry = {
      ...CONSOLIDATED,
      cities: [
        { name: "Colombo", lat: 6.9, lng: 79.8, notes: "city beaches and nightlife" },
        { name: "Ella", lat: 6.8, lng: 81.0 },
      ],
      itinerary: {
        cityOrder: ["Ella"],
        cities: {
          Ella: {
            name: "Ella",
            minDays: 1,
            recDays: 2,
            maxDays: 3,
            days: [{ theme: "Tea country walks and wildlife safari", activities: [{ name: "Nine Arches" }] }],
          },
        },
        connections: [],
      },
    };
    const c = consolidatedToCountry(withRule);
    const colombo = c.cities?.find((x) => x.name === "Colombo");
    const ella = c.cities?.find((x) => x.name === "Ella");
    expect(colombo?.experiences).toEqual(["Beaches"]);
    expect(ella?.experiences).toEqual(["Tea country", "Wildlife"]);
  });

  it("prefers authored itinerary-city experiences over text derivation", () => {
    const withRule: ConsolidatedCountry = {
      ...CONSOLIDATED,
      cities: [{ name: "Ella", lat: 6.8, lng: 81.0, notes: "city beaches and nightlife" }],
      itinerary: {
        cityOrder: ["Ella"],
        cities: {
          Ella: {
            name: "Ella",
            minDays: 1,
            recDays: 2,
            maxDays: 3,
            experiences: ["Tea country", "Wildlife"],
            days: [{ theme: "Beach day", activities: [{ name: "Colombo Beach" }] }],
          },
        },
        connections: [],
      },
    };
    const c = consolidatedToCountry(withRule);
    const ella = c.cities?.find((x) => x.name === "Ella");
    expect(ella?.experiences).toEqual(["Tea country", "Wildlife"]);
  });

  it("honours an authored city experiences override", () => {
    const authored: ConsolidatedCountry = {
      ...CONSOLIDATED,
      cities: [{ name: "Colombo", lat: 6.9, lng: 79.8, notes: "beaches", experiences: ["Wildlife"] }],
    };
    const c = consolidatedToCountry(authored);
    expect(c.cities?.[0].experiences).toEqual(["Wildlife"]);
  });
});

describe("mergeCountryData", () => {
  it("returns the base unchanged when no rule data is available", () => {
    expect(mergeCountryData(MINIMAL_STUB, null)).toBe(MINIMAL_STUB);
  });

  it("hydrates an empty stub from rule data", () => {
    const merged = mergeCountryData(MINIMAL_STUB, CONSOLIDATED);
    expect(merged.experiences).toEqual(["Beaches", "Tea country", "Wildlife"]);
    expect(merged.budget).toBe("₹1L");
    expect(merged.bestMonths).toEqual(["January", "February"]);
    expect(merged.combo).toEqual(["India", "Maldives"]);
    expect(merged.cities).toHaveLength(1);
  });

  it("never overwrites user-authored values", () => {
    const edited: Country = {
      ...MINIMAL_STUB,
      budget: "₹5L custom",
      experiences: ["My own pick"],
      notes: "Remember visa",
    };
    const merged = mergeCountryData(edited, CONSOLIDATED);
    expect(merged.budget).toBe("₹5L custom");
    expect(merged.experiences).toEqual(["My own pick"]);
    expect(merged.notes).toBe("Remember visa");
    // still fills fields the user left empty
    expect(merged.combo).toEqual(["India", "Maldives"]);
  });

  it("backfills empty per-city seasonality/experience fields from the rule", () => {
    const rich: ConsolidatedCountry = {
      ...CONSOLIDATED,
      cities: [
        {
          name: "Colombo",
          lat: 6.9,
          lng: 79.8,
          bestMonths: ["January"],
          worstMonths: ["May"],
          experiences: ["Beaches"],
        },
      ],
    };
    const edited: Country = {
      ...MINIMAL_STUB,
      cities: [{ name: "Colombo", lat: 6.9, lng: 79.8, notes: "user note" }],
    };
    const merged = mergeCountryData(edited, rich);
    const colombo = merged.cities?.[0];
    expect(colombo?.notes).toBe("user note");
    expect(colombo?.bestMonths).toEqual(["January"]);
    expect(colombo?.worstMonths).toEqual(["May"]);
    expect(colombo?.experiences).toEqual(["Beaches"]);
  });

  it("keeps authored per-city values and preserves user-only cities", () => {
    const rich: ConsolidatedCountry = {
      ...CONSOLIDATED,
      cities: [
        { name: "Colombo", lat: 6.9, lng: 79.8, worstMonths: ["May"], experiences: ["Beaches"] },
      ],
    };
    const edited: Country = {
      ...MINIMAL_STUB,
      cities: [
        { name: "Colombo", lat: 6.9, lng: 79.8, worstMonths: ["December"], experiences: ["Nightlife"] },
        { name: "My Village", lat: 7.0, lng: 80.0 },
      ],
    };
    const merged = mergeCountryData(edited, rich);
    expect(merged.cities?.[0].worstMonths).toEqual(["December"]);
    expect(merged.cities?.[0].experiences).toEqual(["Nightlife"]);
    expect(merged.cities?.[1].name).toBe("My Village");
    expect(merged.cities).toHaveLength(2);
  });
});
