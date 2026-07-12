import { describe, it, expect, vi } from "vitest";
import type { TripPlan } from "@/core/utils/tripPlans.ts";
import type { Country } from "@/core/types.ts";

// We can't test actual window.print() in jsdom, but we can test the
// module exports and that the function doesn't throw with valid input.

describe("pdfExport — P1", () => {
  it("exports the exportItineraryAsPdf function", async () => {
    const mod = await import("@/utils/pdfExport.ts");
    expect(typeof mod.exportItineraryAsPdf).toBe("function");
  });

  it("does not throw with valid plan and country", async () => {
    const { exportItineraryAsPdf } = await import("@/utils/pdfExport.ts");

    const plan: TripPlan = {
      duration: "7 days",
      costPerPerson: "₹1.2L",
      note: "Great trip",
      days: [
        { label: "Day 1 — Oslo", activities: ["Visit Vigeland Park"], theme: "City Icons" },
        { label: "Day 2 — Bergen", activities: ["Bryggen Wharf", "Fløyen funicular"] },
      ],
    };

    const country: Country = {
      name: "Norway",
      lat: 60.47,
      lng: 10.75,
      bestMonths: ["June", "July"],
      budget: "₹1L–₹2L",
      experiences: ["Fjords"],
    };

    // In jsdom, iframe creation works but print() is a no-op
    expect(() => exportItineraryAsPdf(plan, country, "India")).not.toThrow();
  });

  it("handles plan with warnings and hotels", async () => {
    const { exportItineraryAsPdf } = await import("@/utils/pdfExport.ts");

    const plan: TripPlan = {
      duration: "3 days",
      costPerPerson: "₹50K",
      note: "Short trip",
      warning: "Very tight schedule",
      days: [
        {
          label: "Day 1 — Tokyo",
          activities: ["Shibuya crossing"],
          hotels: ["Park Hotel — ₹20K/night"],
        },
      ],
    };

    const country: Country = {
      name: "Japan",
      lat: 36.2,
      lng: 138.25,
      bestMonths: ["March", "April"],
      budget: "₹1L–₹2L",
      experiences: ["Temples"],
    };

    expect(() => exportItineraryAsPdf(plan, country, "India")).not.toThrow();
  });

  it("mobile path opens a tab with a Save-as-PDF button and auto-print script", async () => {
    const { exportItineraryAsPdf } = await import("@/utils/pdfExport.ts");

    const originalUA = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      configurable: true,
    });

    let written = "";
    const fakeWin = {
      document: {
        open: () => {},
        write: (html: string) => { written += html; },
        close: () => {},
      },
    } as unknown as Window;
    const openSpy = vi.spyOn(window, "open").mockReturnValue(fakeWin);

    const plan: TripPlan = {
      duration: "2 days",
      costPerPerson: "₹40K",
      note: "Weekend",
      days: [{ label: "Day 1 — Bali", activities: ["Beach"] }],
    };
    const country: Country = {
      name: "Indonesia",
      lat: -8.4,
      lng: 115.2,
      bestMonths: ["May"],
      budget: "₹1L",
      experiences: ["Beaches"],
    };

    exportItineraryAsPdf(plan, country, "India");

    expect(openSpy).toHaveBeenCalledWith("", "_blank");
    expect(written).toContain("Save as PDF");
    expect(written).toContain("window.print()");

    openSpy.mockRestore();
    Object.defineProperty(navigator, "userAgent", { value: originalUA, configurable: true });
  });

  it("mobile multi-stop path renders a route title and per-stop section headers", async () => {
    const { exportItineraryAsPdf } = await import("@/utils/pdfExport.ts");

    const originalUA = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      configurable: true,
    });

    let written = "";
    const fakeWin = {
      document: {
        open: () => {},
        write: (html: string) => { written += html; },
        close: () => {},
      },
    } as unknown as Window;
    const openSpy = vi.spyOn(window, "open").mockReturnValue(fakeWin);

    const plan: TripPlan = {
      duration: "4 days",
      costPerPerson: "₹1L",
      note: "Nordic loop",
      days: [
        { label: "Day 1 — Oslo", activities: ["Opera House"] },
        { label: "Day 2 — Bergen", activities: ["Bryggen"] },
        { label: "Day 3 — Stockholm", activities: ["Gamla Stan"] },
        { label: "Day 4 — Stockholm", activities: ["Vasa Museum"] },
      ],
    };
    const country: Country = {
      name: "Norway",
      lat: 60.47,
      lng: 8.47,
      bestMonths: ["June"],
      budget: "₹1.5L",
      experiences: ["Fjords"],
    };
    const stops = [
      { name: "Norway", dayCount: 2, cost: "₹60K", bestMonths: ["June"], note: "SIM: Telenor | Vy · DNB" },
      { name: "Sweden", dayCount: 2, cost: "₹40K", bestMonths: ["May"], note: "SIM: Comviq | SL" },
    ];

    exportItineraryAsPdf(plan, country, "India", stops);

    expect(written).toContain("Norway → Sweden");
    expect(written).toContain("section-header");
    expect(written).toContain("Stop 1");
    expect(written).toContain("Stop 2");
    expect(written).toContain("2 countries");
    // Each stop's own practical note is rendered (not the generic composed note).
    expect(written).toContain("Practical notes · Norway");
    expect(written).toContain("Practical notes · Sweden");
    expect(written).toContain("Telenor");
    expect(written).toContain("Comviq");
    expect(written).not.toContain("Nordic loop");
    // A shareable link back to the app.
    expect(written).toContain("Plan your own trip");

    openSpy.mockRestore();
    Object.defineProperty(navigator, "userAgent", { value: originalUA, configurable: true });
  });

  it("desktop path does not inject the interactive Save-as-PDF button", async () => {
    const { exportItineraryAsPdf } = await import("@/utils/pdfExport.ts");

    const originalUA = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      configurable: true,
    });

    const plan: TripPlan = {
      duration: "2 days",
      costPerPerson: "₹40K",
      note: "Weekend",
      days: [{ label: "Day 1 — Paris", activities: ["Louvre"] }],
    };
    const country: Country = {
      name: "France",
      lat: 48.85,
      lng: 2.35,
      bestMonths: ["May"],
      budget: "₹1L",
      experiences: ["Museums"],
    };

    expect(() => exportItineraryAsPdf(plan, country, "India")).not.toThrow();

    Object.defineProperty(navigator, "userAgent", { value: originalUA, configurable: true });
  });
});

describe("buildItineraryHtml — shared Export/Share template", () => {
  const country: Country = {
    name: "Norway",
    lat: 60.47,
    lng: 10.75,
    bestMonths: ["June"],
    budget: "₹1L",
    experiences: ["Fjords"],
  };

  it("renders a single-destination document with the country title and day labels", async () => {
    const { buildItineraryHtml } = await import("@/utils/pdfExport.ts");
    const plan: TripPlan = {
      duration: "2 days",
      costPerPerson: "₹1L",
      note: "note",
      days: [
        { label: "Day 1 — Oslo", activities: ["Vigeland Park"] },
        { label: "Day 2 — Bergen", activities: ["Bryggen Wharf"] },
      ],
    };
    const html = buildItineraryHtml(plan, country, "India");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Norway");
    expect(html).toContain("Day 1 — Oslo");
    expect(html).toContain("Vigeland Park");
    // Non-interactive: no auto-print button/script (that's Export-mobile only).
    expect(html).not.toContain("Save as PDF");
  });

  it("renders per-stop section headers for a multi-stop route", async () => {
    const { buildItineraryHtml } = await import("@/utils/pdfExport.ts");
    const plan: TripPlan = {
      duration: "3 days",
      costPerPerson: "₹1.5L",
      note: "note",
      days: [
        { label: "Day 1 — Oslo", activities: ["Fjords"] },
        { label: "Day 2 — Stockholm", activities: ["Gamla Stan"] },
        { label: "Day 3 — Copenhagen", activities: ["Nyhavn"] },
      ],
    };
    const stops = [
      { name: "Norway", dayCount: 1, cost: "₹50K" },
      { name: "Sweden", dayCount: 1, cost: "₹50K" },
      { name: "Denmark", dayCount: 1, cost: "₹50K" },
    ];
    const html = buildItineraryHtml(plan, country, "India", stops);
    expect(html).toContain("Stop 1");
    expect(html).toContain("Sweden");
    expect(html).toContain("Denmark");
  });
});
