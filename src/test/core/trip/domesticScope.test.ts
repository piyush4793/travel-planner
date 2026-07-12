import { describe, it, expect } from "vitest";
import { hasDomesticScope } from "@/core/trip/domesticScope";

describe("hasDomesticScope", () => {
  it("recognises India (the only shipped domestic dataset), case/space-insensitively", () => {
    expect(hasDomesticScope("India")).toBe(true);
    expect(hasDomesticScope("india")).toBe(true);
    expect(hasDomesticScope("  INDIA  ")).toBe(true);
  });

  it("returns false for home countries without a domestic dataset", () => {
    expect(hasDomesticScope("France")).toBe(false);
    expect(hasDomesticScope("United States")).toBe(false);
    expect(hasDomesticScope("")).toBe(false);
  });
});
