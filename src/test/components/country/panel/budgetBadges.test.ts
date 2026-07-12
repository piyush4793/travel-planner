import { describe, it, expect } from "vitest";
import { getBudgetBadges } from "@/components/country/panel/utils.ts";
import type { Country } from "@/core/types.ts";

const baseCountry: Country = {
  name: "Testland",
  lat: 0,
  lng: 0,
  bestMonths: [],
  budget: "₹2L",
  experiences: [],
};

const ruleBudget = { solo: "₹1L", couple: "₹2L", family4: "₹4L" };
// getBudgetBadges only reads `.budget` off the consolidated record.
const consolidated = { budget: ruleBudget } as never;

describe("getBudgetBadges", () => {
  it("prefers the country's edited per-basis budget over the raw rule data", () => {
    const edited: Country = {
      ...baseCountry,
      budgetBreakdown: { solo: "₹5L", couple: "₹8L", family4: "₹12L" },
    };
    const badges = getBudgetBadges(edited, consolidated);
    expect(badges.map((b) => b.label)).toEqual(["₹5L", "₹8L", "₹12L"]);
  });

  it("falls back to the rule breakdown when the country has no override", () => {
    const badges = getBudgetBadges(baseCountry, consolidated);
    expect(badges.map((b) => b.label)).toEqual(["₹1L", "₹2L", "₹4L"]);
  });

  it("falls back to the single budget string when no breakdown exists at all", () => {
    const badges = getBudgetBadges(baseCountry, null);
    expect(badges).toHaveLength(1);
    expect(badges[0].label).toBe("₹2L");
    expect(badges[0].basis).toBeUndefined();
  });

  it("tags each breakdown badge with its basis in canonical order", () => {
    const badges = getBudgetBadges(baseCountry, consolidated);
    expect(badges.map((b) => b.basis)).toEqual(["solo", "couple", "family4"]);
  });
});
