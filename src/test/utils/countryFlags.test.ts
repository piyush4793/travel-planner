import { describe, it, expect } from "vitest";
import { getCountryFlag } from "@/utils/countryFlags.ts";

describe("getCountryFlag", () => {
  it("resolves single-word country names", () => {
    expect(getCountryFlag("Germany")).toBe("🇩🇪");
    expect(getCountryFlag("Turkey")).toBe("🇹🇷");
    expect(getCountryFlag("France")).toBe("🇫🇷");
    expect(getCountryFlag("India")).toBe("🇮🇳");
  });

  it("resolves multi-word country names", () => {
    expect(getCountryFlag("United States")).toBe("🇺🇸");
    expect(getCountryFlag("South Korea")).toBe("🇰🇷");
    expect(getCountryFlag("New Zealand")).toBe("🇳🇿");
    expect(getCountryFlag("Saudi Arabia")).toBe("🇸🇦");
    expect(getCountryFlag("United Arab Emirates")).toBe("🇦🇪");
  });

  it("resolves common aliases", () => {
    expect(getCountryFlag("UK")).toBe("🇬🇧");
    expect(getCountryFlag("United Kingdom")).toBe("🇬🇧");
    expect(getCountryFlag("USA")).toBe("🇺🇸");
    expect(getCountryFlag("UAE")).toBe("🇦🇪");
    expect(getCountryFlag("Dubai")).toBe("🇦🇪");
  });

  it("handles special emoji overrides", () => {
    expect(getCountryFlag("Scotland")).toBe("🏴󠁧󠁢󠁳󠁣󠁴󠁿");
    expect(getCountryFlag("Hawaii")).toBe("🌺");
    expect(getCountryFlag("Antarctica")).toBe("🇦🇶");
  });

  it("trims whitespace from input", () => {
    expect(getCountryFlag("  Germany  ")).toBe("🇩🇪");
    expect(getCountryFlag(" UK ")).toBe("🇬🇧");
  });

  it("returns globe fallback for unknown names", () => {
    expect(getCountryFlag("Narnia")).toBe("🌍");
    expect(getCountryFlag("")).toBe("🌍");
  });

  it("covers all catalog regions", () => {
    // One from each region
    expect(getCountryFlag("Japan")).toBe("🇯🇵");       // Asia
    expect(getCountryFlag("Norway")).toBe("🇳🇴");      // Europe
    expect(getCountryFlag("Kenya")).toBe("🇰🇪");       // Africa
    expect(getCountryFlag("Brazil")).toBe("🇧🇷");      // Americas
    expect(getCountryFlag("Australia")).toBe("🇦🇺");   // Oceania
  });
});
