import { describe, it, expect } from "vitest";
import { pickNightTarget, canAdjustLength, MIN_STOP_NIGHTS, type LengthStop } from "../core/utils/tripLength";

const stop = (days: number, maxDays = 10, pinned = false): LengthStop => ({ days, maxDays, pinned });

describe("tripLength — pickNightTarget", () => {
  it("grows the currently-shortest unpinned stop (even fill)", () => {
    expect(pickNightTarget([stop(5), stop(2), stop(4)], 1)).toBe(1);
  });

  it("shrinks the currently-longest unpinned stop (even drain)", () => {
    expect(pickNightTarget([stop(5), stop(2), stop(7)], -1)).toBe(2);
  });

  it("skips pinned stops", () => {
    // The 2-night stop is pinned, so growth lands on the next-shortest (index 2).
    expect(pickNightTarget([stop(5), stop(2, 10, true), stop(4)], 1)).toBe(2);
  });

  it("skips stops already at their max when growing", () => {
    expect(pickNightTarget([stop(10, 10), stop(6, 10)], 1)).toBe(1);
  });

  it("skips stops at the minimum when shrinking", () => {
    expect(pickNightTarget([stop(MIN_STOP_NIGHTS), stop(3)], -1)).toBe(1);
  });

  it("returns null when no unpinned stop can absorb the change", () => {
    expect(pickNightTarget([stop(10, 10), stop(8, 8)], 1)).toBeNull();
    expect(pickNightTarget([stop(1), stop(1)], -1)).toBeNull();
    expect(pickNightTarget([stop(5, 10, true)], 1)).toBeNull();
  });

  it("ties break to the lowest index for a stable, predictable spread", () => {
    expect(pickNightTarget([stop(3), stop(3), stop(3)], 1)).toBe(0);
    expect(pickNightTarget([stop(3), stop(3), stop(3)], -1)).toBe(0);
  });

  it("canAdjustLength mirrors pickNightTarget feasibility", () => {
    expect(canAdjustLength([stop(3)], 1)).toBe(true);
    expect(canAdjustLength([stop(10, 10)], 1)).toBe(false);
    expect(canAdjustLength([stop(1)], -1)).toBe(false);
  });
});
