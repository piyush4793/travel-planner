import { describe, it, expect } from "vitest";
import { STYLE_META, TRAVEL_STYLES, defaultDaysForStyle } from "@/core/utils/travelStyles.ts";
import type { TravelStyle } from "@/core/types.ts";

describe("travelStyles — P0", () => {
  it("TRAVEL_STYLES contains exactly 3 styles", () => {
    expect(TRAVEL_STYLES).toHaveLength(3);
    expect(TRAVEL_STYLES).toContain("touch-and-go");
    expect(TRAVEL_STYLES).toContain("explorer");
    expect(TRAVEL_STYLES).toContain("immersive");
  });

  it("STYLE_META has entries for all TRAVEL_STYLES", () => {
    for (const style of TRAVEL_STYLES) {
      const meta = STYLE_META[style];
      expect(meta).toBeDefined();
      expect(meta.icon).toBeTruthy();
      expect(meta.label).toBeTruthy();
      expect(meta.badge).toBeTruthy();
    }
  });

  it("does not have deprecated 'month-long' key", () => {
    expect(STYLE_META).not.toHaveProperty("month-long");
    expect(TRAVEL_STYLES).not.toContain("month-long");
  });

  it("gracefully handles unknown style keys", () => {
    const unknown = "month-long" as TravelStyle;
    const meta = STYLE_META[unknown];
    expect(meta).toBeUndefined();
  });

  it("immersive has correct label", () => {
    expect(STYLE_META["immersive"].label).toBe("Immersive");
    expect(STYLE_META["immersive"].icon).toBe("🌿");
  });
});

describe("defaultDaysForStyle", () => {
  const rec = 7;
  const max = 12;

  it("explorer uses the recommended day count", () => {
    expect(defaultDaysForStyle("explorer", rec, max)).toBe(rec);
  });

  it("immersive uses the maximum useful day count", () => {
    expect(defaultDaysForStyle("immersive", rec, max)).toBe(max);
  });

  it("touch-and-go is a brisk ~60% of recommended, floored at 1", () => {
    expect(defaultDaysForStyle("touch-and-go", rec, max)).toBe(Math.round(rec * 0.6));
    expect(defaultDaysForStyle("touch-and-go", 1, 2)).toBe(1);
  });

  it("falls back to recommended when no style is set", () => {
    expect(defaultDaysForStyle(undefined, rec, max)).toBe(rec);
  });

  it("never returns fewer days than recommended for immersive when max < rec", () => {
    expect(defaultDaysForStyle("immersive", 10, 6)).toBe(10);
  });
});
