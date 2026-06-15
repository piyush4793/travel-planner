import { describe, it, expect } from "vitest";
import { STYLE_META, TRAVEL_STYLES } from "../core/utils/travelStyles";
import type { TravelStyle } from "../core/types";

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
