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
  type FormState = {
    solo: string;
    landmark: string;
    notes: string;
    travelStyle?: string;
  };
  const isDirty = (initial: FormState, current: FormState) =>
    current.solo !== initial.solo ||
    current.landmark !== initial.landmark ||
    current.notes !== initial.notes ||
    current.travelStyle !== initial.travelStyle;

  it("detects no change when values match initial", () => {
    const initial: FormState = { solo: "₹1L–₹2L", landmark: "Mt Fuji", notes: "hello", travelStyle: "explorer" };
    const current: FormState = { ...initial };
    expect(isDirty(initial, current)).toBe(false);
  });

  it("detects change when the solo budget differs", () => {
    const initial: FormState = { solo: "₹1L", landmark: "", notes: "" };
    const current: FormState = { ...initial, solo: "₹2L" };
    expect(isDirty(initial, current)).toBe(true);
  });

  it("detects change when travel style is (single-)selected", () => {
    const initial: FormState = { solo: "", landmark: "", notes: "", travelStyle: undefined };
    const current: FormState = { ...initial, travelStyle: "immersive" };
    expect(isDirty(initial, current)).toBe(true);
  });

  it("detects change when notes differ", () => {
    const initial: FormState = { solo: "", landmark: "", notes: "", travelStyle: undefined };
    const current: FormState = { ...initial, notes: "new note" };
    expect(isDirty(initial, current)).toBe(true);
  });
});
