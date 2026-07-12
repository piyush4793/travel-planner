import { describe, it, expect } from "vitest";
import { unitFlag } from "@/core/trip/unitFlag";
import { getCountryFlag } from "@/utils/countryFlags";

describe("unitFlag", () => {
  it("uses the country's own flag for international units", () => {
    expect(unitFlag("Japan", "international")).toBe(getCountryFlag("Japan"));
    expect(unitFlag("France", "international")).toBe(getCountryFlag("France"));
  });

  it("uses the home country's flag for domestic (state) units — derived, not hardcoded", () => {
    // Domestic states share the home country's flag; passing "India" yields 🇮🇳,
    // and a different home country would yield that country's flag instead.
    expect(unitFlag("Rajasthan", "domestic", "India")).toBe(getCountryFlag("India"));
    expect(unitFlag("Kerala", "domestic", "India")).toBe(getCountryFlag("India"));
    expect(unitFlag("Bavaria", "domestic", "Germany")).toBe(getCountryFlag("Germany"));
  });

  it("falls back to the unit name when no home country is given", () => {
    expect(unitFlag("India", "domestic")).toBe(getCountryFlag("India"));
  });
});
