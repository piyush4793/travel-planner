import { describe, it, expect } from "vitest";
import type { TripPlan } from "../utils/tripPlans";
import type { Country } from "../types";

// We can't test actual window.print() in jsdom, but we can test the
// module exports and that the function doesn't throw with valid input.

describe("pdfExport — P1", () => {
  it("exports the exportItineraryAsPdf function", async () => {
    const mod = await import("../utils/pdfExport");
    expect(typeof mod.exportItineraryAsPdf).toBe("function");
  });

  it("does not throw with valid plan and country", async () => {
    const { exportItineraryAsPdf } = await import("../utils/pdfExport");

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
    const { exportItineraryAsPdf } = await import("../utils/pdfExport");

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
});
