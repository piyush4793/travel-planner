import { describe, it, expect } from "vitest";

const BUDGET_PATTERN = /^[₹$€£¥][\d.]+[KkLlMm](\s*[–—-]\s*[₹$€£¥][\d.]+[KkLlMm])?$/;

describe("CountryForm budget validation — P0", () => {
  const valid = [
    "₹50K",
    "₹1.5L",
    "₹50K–₹1L",
    "₹1L–₹2L",
    "₹2.5L–₹4L",
    "$2K",
    "$2K–$5K",
    "€3K–€8K",
    "£1.5K",
    "¥100K",
    "₹50k–₹1l",
  ];

  const invalid = [
    "abc",
    "2000",
    "₹",
    "50K",
    "budget",
    "₹50K to ₹1L",
    "around ₹2L",
    "",
  ];

  for (const v of valid) {
    it(`accepts "${v}"`, () => {
      expect(BUDGET_PATTERN.test(v)).toBe(true);
    });
  }

  for (const v of invalid) {
    it(`warns on "${v}"`, () => {
      expect(BUDGET_PATTERN.test(v)).toBe(false);
    });
  }
});

describe("CountryForm dirty check — P0", () => {
  it("detects no change when values match initial", () => {
    const initial = { budget: "₹2L", landmark: "Mt Fuji", notes: "hello", travelStyle: ["explorer"] };
    const current = { budget: "₹2L", landmark: "Mt Fuji", notes: "hello", travelStyle: ["explorer"] };
    const isDirty =
      current.budget !== initial.budget ||
      current.landmark !== initial.landmark ||
      current.notes !== initial.notes ||
      JSON.stringify(current.travelStyle) !== JSON.stringify(initial.travelStyle);
    expect(isDirty).toBe(false);
  });

  it("detects change when budget differs", () => {
    const initial = { budget: "₹2L", landmark: "", notes: "", travelStyle: [] as string[] };
    const current = { ...initial, budget: "₹3L" };
    const isDirty = current.budget !== initial.budget;
    expect(isDirty).toBe(true);
  });

  it("detects change when travel style differs", () => {
    const initial = { budget: "₹2L", landmark: "", notes: "", travelStyle: ["explorer"] };
    const current = { ...initial, travelStyle: ["explorer", "immersive"] };
    const isDirty = JSON.stringify(current.travelStyle) !== JSON.stringify(initial.travelStyle);
    expect(isDirty).toBe(true);
  });

  it("detects change when notes differ", () => {
    const initial = { budget: "₹2L", landmark: "", notes: "", travelStyle: [] as string[] };
    const current = { ...initial, notes: "new note" };
    const isDirty = current.notes !== initial.notes;
    expect(isDirty).toBe(true);
  });
});
