import { describe, it, expect, beforeEach } from "vitest";
import { getFeatureFlags, isEnabled, isPaidTier, setFeatureFlag } from "../core/featureFlags";

describe("featureFlags — P0", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns default flags when nothing is stored", () => {
    const flags = getFeatureFlags();
    expect(flags).toHaveProperty("searchableHomeCountry");
    expect(flags).toHaveProperty("llmPlanning");
    expect(flags).toHaveProperty("pdfExport");
    expect(flags).toHaveProperty("paidFeatures");
  });

  it("isEnabled returns false for paid flags by default (paidFeatures gate)", () => {
    expect(isEnabled("llmPlanning")).toBe(false);
    expect(isEnabled("pdfExport")).toBe(false);
  });

  it("setFeatureFlag persists to localStorage", () => {
    setFeatureFlag("searchableHomeCountry", true);
    const raw = localStorage.getItem("tp_features");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.searchableHomeCountry).toBe(true);
  });

  it("stored overrides merge with defaults", () => {
    localStorage.setItem("tp_features", JSON.stringify({ searchableHomeCountry: true }));
    const flags = getFeatureFlags();
    expect(flags.llmPlanning).toBeDefined();
  });

  describe("paid tier gating", () => {
    it("paidFeatures defaults to false", () => {
      expect(isPaidTier()).toBe(false);
    });

    it("llmPlanning is hidden by default (paidFeatures=false)", () => {
      expect(isEnabled("llmPlanning")).toBe(false);
    });

    it("llmPlanning is enabled when paidFeatures=true", () => {
      setFeatureFlag("paidFeatures", true);
      setFeatureFlag("llmPlanning", true);
      expect(isEnabled("llmPlanning")).toBe(true);
    });

    it("llmPlanning is disabled when paidFeatures=false even if flag is true", () => {
      setFeatureFlag("paidFeatures", false);
      setFeatureFlag("llmPlanning", true);
      expect(isEnabled("llmPlanning")).toBe(false);
    });

    it("free features are unaffected by paidFeatures", () => {
      setFeatureFlag("paidFeatures", false);
      setFeatureFlag("searchableHomeCountry", true);
      expect(isEnabled("searchableHomeCountry")).toBe(true);
    });

    it("paidFeatures flag itself is not gated", () => {
      setFeatureFlag("paidFeatures", true);
      expect(isEnabled("paidFeatures")).toBe(true);
      setFeatureFlag("paidFeatures", false);
      expect(isEnabled("paidFeatures")).toBe(false);
    });
  });
});
