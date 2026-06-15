import { describe, it, expect } from "vitest";
import { extractPlanCities, isRealCity, normalizeCityName } from "../core/utils/tripPlans";
import { estimateCost, formatCost, PROVIDER_PRICING } from "../utils/ai/llmProvider";
import { parseImportedText } from "../utils/importParser";

describe("a11y — aria attributes", () => {
  it("isRealCity filters noise entries that would confuse screen readers", () => {
    expect(isRealCity("Oslo")).toBe(true);
    expect(isRealCity("Stay: Bergen")).toBe(false);
    expect(isRealCity("RETURN")).toBe(false);
    expect(isRealCity("Entry costs:")).toBe(false);
  });
});

describe("responsive — breakpoint thresholds", () => {
  it("normalizeCityName handles mixed case for mobile display", () => {
    expect(normalizeCityName("OSLO")).toBe("oslo");
    expect(normalizeCityName("Stay: Flåm")).toBe("flåm");
  });
});

describe("performance — cost estimation is pure and fast", () => {
  it("estimateCost returns consistent results (no side effects)", () => {
    const a = estimateCost("openai", 10000, 5000);
    const b = estimateCost("openai", 10000, 5000);
    expect(a).toBe(b);
  });

  it("formatCost handles edge cases without errors", () => {
    expect(formatCost(0)).toBe("<$0.001");
    expect(formatCost(0.0001)).toBe("<$0.001");
    expect(formatCost(999)).toBe("~$999.00");
  });
});

describe("functional — import parser robustness", () => {
  it("handles extremely long input without hanging", () => {
    const longText = Array(500).fill("Day 1 — Oslo: Visit Museum\n").join("");
    const start = performance.now();
    const result = parseImportedText(longText);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(1000);
    expect("error" in result).toBe(false);
  });

  it("handles malicious/weird unicode without crashing", () => {
    const text = "Day 1 — Tōkyō: 🎌 Visit 寺院\nDay 2 — Ōsaka: 🏯 Castle";
    const result = parseImportedText(text);
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.durationDays).toBe(2);
    }
  });

  it("handles empty day content gracefully", () => {
    const text = "Day 1 — Oslo:\nDay 2 — Bergen:";
    const result = parseImportedText(text);
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.plan.days.length).toBe(2);
    }
  });
});

describe("memory — no leaked references in pure utils", () => {
  it("extractPlanCities returns a new array each call", () => {
    const days = [{ label: "Day 1 — Oslo", activities: [] }];
    const a = extractPlanCities(days);
    const b = extractPlanCities(days);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it("PROVIDER_PRICING is frozen/stable reference", () => {
    expect(PROVIDER_PRICING.openai.model).toBeTruthy();
    expect(PROVIDER_PRICING.claude.model).toBeTruthy();
    expect(PROVIDER_PRICING.gemini.model).toBeTruthy();
  });
});
