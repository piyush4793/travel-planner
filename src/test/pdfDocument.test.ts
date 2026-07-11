import { describe, it, expect } from "vitest";
import { buildItineraryPdfBlob, itineraryPdfName } from "../utils/pdfDocument";
import type { TripPlan } from "../core/utils/tripPlans";
import type { Country } from "../core/types";

const COUNTRY: Country = {
  name: "India",
  lat: 20.59,
  lng: 78.96,
  bestMonths: ["October"],
  budget: "₹1L–₹2L",
  experiences: ["Temples"],
  cities: [{ name: "Delhi", lat: 28.6, lng: 77.2 }],
};

const PLAN: TripPlan = {
  duration: "3 days",
  costPerPerson: "₹36K – ₹63K",
  warning: "Monsoon season",
  days: [
    { label: "Day 1 — Delhi", theme: "Old Delhi", activities: ["Red Fort", "Jama Masjid"], hotels: ["The Imperial"] },
    { label: "Day 2 — Delhi", theme: "New Delhi", activities: ["India Gate"] },
  ],
  note: "Prices are indicative",
};

describe("pdfDocument", () => {
  it("builds a non-empty PDF blob", () => {
    const blob = buildItineraryPdfBlob(PLAN, COUNTRY, "India");
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(0);
  });

  it("tolerates a minimal plan without optional fields", () => {
    const minimal: TripPlan = { duration: "1 day", costPerPerson: "₹5K", days: [{ label: "Day 1", activities: ["Walk"] }], note: "" };
    expect(() => buildItineraryPdfBlob(minimal, { ...COUNTRY, bestMonths: [], budget: "" }, "Nepal")).not.toThrow();
  });

  it("derives a filesystem-safe filename from the country name", () => {
    expect(itineraryPdfName(COUNTRY)).toBe("India-itinerary.pdf");
    expect(itineraryPdfName({ ...COUNTRY, name: "Côte d'Ivoire" })).toMatch(/^[\w-]+-itinerary\.pdf$/);
  });

  it("builds a multi-stop route PDF with per-stop sections", () => {
    const multiPlan: TripPlan = {
      ...PLAN,
      duration: "4 days",
      days: [
        { label: "Day 1 — Delhi", activities: ["Red Fort"] },
        { label: "Day 2 — Agra", activities: ["Taj Mahal"] },
        { label: "Day 3 — Kathmandu", activities: ["Boudhanath"] },
        { label: "Day 4 — Pokhara", activities: ["Phewa Lake"] },
      ],
    };
    const stops = [
      { name: "India", dayCount: 2, cost: "₹40K", bestMonths: ["October"], note: "SIM: Airtel | Ola · Uber" },
      { name: "Nepal", dayCount: 2, cost: "₹30K", bestMonths: ["March"], note: "SIM: Ncell | Pathao" },
    ];
    const blob = buildItineraryPdfBlob(multiPlan, COUNTRY, "India", stops);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(0);
  });
});
