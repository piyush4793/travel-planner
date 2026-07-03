import { describe, it, expect } from "vitest";
import { consolidatedToCountry, mergeCountryData } from "../core/utils/countryData";
import type { Country } from "../core/types";
import type { ConsolidatedCountry } from "../data/consolidatedCountry";

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
});
