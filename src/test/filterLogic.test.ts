import { describe, it, expect } from "vitest";
import {
  filterByMonth,
  filterByExperiences,
  filterByVisited,
  filterByBudget,
  getBudgetTier,
  applyFilters,
  allUniqueExperiences,
} from "../core/utils/filterLogic";
import type { Country } from "../core/types";

const COUNTRIES: Country[] = [
  {
    name: "Norway",
    lat: 60,
    lng: 10,
    bestMonths: ["June", "July", "August"],
    budget: "₹1.5L–₹3L",
    experiences: ["Northern Lights", "Fjords", "Hiking"],
  },
  {
    name: "Thailand",
    lat: 15,
    lng: 100,
    bestMonths: ["November", "December", "January", "February"],
    budget: "₹50K–₹1L",
    experiences: ["Beaches", "Temples", "Street Food"],
  },
  {
    name: "Switzerland",
    lat: 47,
    lng: 8,
    bestMonths: ["June", "July", "August", "September"],
    budget: "₹3.5L–₹5L",
    experiences: ["Hiking", "Skiing", "Lakes"],
  },
];

describe("filterLogic — P0", () => {
  describe("filterByMonth", () => {
    it("returns all when no months selected", () => {
      expect(filterByMonth(COUNTRIES, [])).toHaveLength(3);
    });

    it("filters to countries with matching best months", () => {
      const result = filterByMonth(COUNTRIES, ["Jun"]);
      expect(result.map((c) => c.name)).toContain("Norway");
      expect(result.map((c) => c.name)).toContain("Switzerland");
      expect(result.map((c) => c.name)).not.toContain("Thailand");
    });

    it("handles Nov which matches Thailand", () => {
      const result = filterByMonth(COUNTRIES, ["Nov"]);
      expect(result.map((c) => c.name)).toContain("Thailand");
    });
  });

  describe("filterByExperiences", () => {
    it("returns all when no tags selected", () => {
      expect(filterByExperiences(COUNTRIES, [])).toHaveLength(3);
    });

    it("filters by single experience", () => {
      const result = filterByExperiences(COUNTRIES, ["Hiking"]);
      expect(result).toHaveLength(2);
      expect(result.map((c) => c.name)).toEqual(["Norway", "Switzerland"]);
    });

    it("AND logic — all tags must match", () => {
      const result = filterByExperiences(COUNTRIES, ["Hiking", "Fjords"]);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Norway");
    });

    it("returns empty when no country has all tags", () => {
      expect(filterByExperiences(COUNTRIES, ["Beaches", "Skiing"])).toHaveLength(0);
    });
  });

  describe("filterByVisited", () => {
    const visited = new Set(["Thailand"]);

    it("returns all when filter is 'all'", () => {
      expect(filterByVisited(COUNTRIES, visited, "all")).toHaveLength(3);
    });

    it("returns only visited", () => {
      const result = filterByVisited(COUNTRIES, visited, "visited");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Thailand");
    });

    it("returns only unvisited", () => {
      const result = filterByVisited(COUNTRIES, visited, "unvisited");
      expect(result).toHaveLength(2);
    });
  });

  describe("getBudgetTier", () => {
    it("classifies budget tier correctly", () => {
      expect(getBudgetTier("₹50K–₹1L")).toBe("budget");
      // ₹1.5L = 150000, boundary is <= 150000 → budget
      expect(getBudgetTier("₹1.5L–₹3L")).toBe("budget");
      expect(getBudgetTier("₹2L–₹3L")).toBe("mid");
      expect(getBudgetTier("₹3.5L–₹5L")).toBe("premium");
    });

    it("returns budget for unparseable strings", () => {
      expect(getBudgetTier("free")).toBe("budget");
    });
  });

  describe("filterByBudget", () => {
    it("returns all when tier is 'all'", () => {
      expect(filterByBudget(COUNTRIES, "all")).toHaveLength(3);
    });

    it("filters budget tier", () => {
      // Thailand (₹50K) + Norway (₹1.5L = 150K boundary) are both "budget"
      expect(filterByBudget(COUNTRIES, "budget")).toHaveLength(2);
      expect(filterByBudget(COUNTRIES, "mid")).toHaveLength(0);
      expect(filterByBudget(COUNTRIES, "premium")).toHaveLength(1);
    });
  });

  describe("applyFilters", () => {
    it("combines all filters with AND logic", () => {
      const result = applyFilters(COUNTRIES, ["Jun"], ["Hiking"], new Set<string>(), "all", "all");
      expect(result).toHaveLength(2); // Norway, Switzerland
    });

    it("returns empty when filters are incompatible", () => {
      const result = applyFilters(COUNTRIES, ["Nov"], ["Skiing"], new Set<string>(), "all", "all");
      expect(result).toHaveLength(0);
    });
  });

  describe("allUniqueExperiences", () => {
    it("returns sorted unique experiences", () => {
      const exps = allUniqueExperiences(COUNTRIES);
      expect(exps).toEqual([
        "Beaches", "Fjords", "Hiking", "Lakes",
        "Northern Lights", "Skiing", "Street Food", "Temples",
      ]);
    });

    it("returns empty for empty input", () => {
      expect(allUniqueExperiences([])).toEqual([]);
    });
  });
});
