import { describe, it, expect, beforeEach } from "vitest";
import { loadPlanDraft, savePlanDraft, clearPlanDraft } from "@/components/views/plan/shell/planDraft";
import { LS_KEYS } from "@/core/lsKeys.ts";

describe("planDraft", () => {
  beforeEach(() => localStorage.clear());

  it("returns null when nothing is stored", () => {
    expect(loadPlanDraft()).toBeNull();
  });

  it("round-trips an array-shaped draft", () => {
    savePlanDraft({ countries: ["Japan", "Peru"], step: 2, cities: ["Kyoto"], experiences: ["Food"], days: 12, pinned: true, scope: "international" });
    expect(loadPlanDraft()).toEqual({
      countries: ["Japan", "Peru"],
      step: 2,
      cities: ["Kyoto"],
      experiences: ["Food"],
      days: 12,
      pinned: true,
      scope: "international",
    });
  });

  it("migrates the legacy single-country shape to an ordered list", () => {
    localStorage.setItem(
      LS_KEYS.PLAN_DRAFT,
      JSON.stringify({ country: "Japan", step: 1, cities: ["Tokyo"], experiences: [], days: 7, pinned: false }),
    );
    const draft = loadPlanDraft();
    expect(draft?.countries).toEqual(["Japan"]);
    expect(draft?.step).toBe(1);
    expect(draft?.cities).toEqual(["Tokyo"]);
    expect(draft?.scope).toBe("international");
  });

  it("treats an empty selection as no draft", () => {
    localStorage.setItem(LS_KEYS.PLAN_DRAFT, JSON.stringify({ countries: [], step: 0 }));
    expect(loadPlanDraft()).toBeNull();
  });

  it("clears the stored draft", () => {
    savePlanDraft({ countries: ["Japan"], step: 0, cities: [], experiences: [], days: 5, pinned: false, scope: "international" });
    clearPlanDraft();
    expect(loadPlanDraft()).toBeNull();
  });
});
