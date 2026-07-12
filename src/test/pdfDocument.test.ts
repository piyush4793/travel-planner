import { describe, it, expect, vi } from "vitest";
import type { TripPlan } from "../core/utils/tripPlans";
import type { Country } from "../core/types";

// html2canvas needs a real rendering engine (unavailable in jsdom), so stub it
// with a fake canvas. The PDF assembly (jsPDF addImage + pagination) is exercised
// for real; the source HTML is the print template, verified in pdfExport tests.
const PNG_1x1 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC";

vi.mock("html2canvas", () => ({
  default: vi.fn(async () => ({
    width: 800,
    height: 2400, // tall enough to force multi-page pagination
    toDataURL: () => PNG_1x1,
  })),
}));

import { buildItineraryPdfBlob, itineraryPdfName, paginate } from "../utils/pdfDocument";
import html2canvas from "html2canvas";

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
  it("builds a non-empty PDF blob by rasterising the itinerary HTML", async () => {
    const blob = await buildItineraryPdfBlob(PLAN, COUNTRY, "India");
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(0);
    // The Export template is what gets rendered — html2canvas was invoked.
    expect(html2canvas).toHaveBeenCalled();
  });

  it("cleans up the off-screen render iframe", async () => {
    const before = document.querySelectorAll("iframe").length;
    await buildItineraryPdfBlob(PLAN, COUNTRY, "India");
    expect(document.querySelectorAll("iframe").length).toBe(before);
  });

  it("tolerates a minimal plan without optional fields", async () => {
    const minimal: TripPlan = { duration: "1 day", costPerPerson: "₹5K", days: [{ label: "Day 1", activities: ["Walk"] }], note: "" };
    await expect(buildItineraryPdfBlob(minimal, { ...COUNTRY, bestMonths: [], budget: "" }, "Nepal")).resolves.toBeInstanceOf(Blob);
  });

  it("derives a filesystem-safe filename from the country name", () => {
    expect(itineraryPdfName(COUNTRY)).toBe("India-itinerary.pdf");
    expect(itineraryPdfName({ ...COUNTRY, name: "Côte d'Ivoire" })).toMatch(/^[\w-]+-itinerary\.pdf$/);
  });

  it("builds a multi-stop route PDF from the composed plan", async () => {
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
    const blob = await buildItineraryPdfBlob(multiPlan, COUNTRY, "India", stops);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(0);
  });
});

describe("paginate (card-boundary page breaks)", () => {
  // Three 100px-tall blocks stacked; page holds 250px.
  const tops = [0, 100, 200];
  const bottoms = [100, 200, 300];

  it("breaks between blocks so none is split across a page", () => {
    const slices = paginate(tops, bottoms, 300, 250);
    // Block 3 (200–300) overflows page 1 (0–250) → break at its top (200).
    expect(slices).toEqual([
      { start: 0, end: 200 },
      { start: 200, end: 300 },
    ]);
  });

  it("keeps everything on one page when it all fits", () => {
    expect(paginate(tops, bottoms, 300, 400)).toEqual([{ start: 0, end: 300 }]);
  });

  it("hard-splits a single block taller than a page", () => {
    // One 600px block, page holds 250px → 3 forced slices.
    const slices = paginate([0], [600], 600, 250);
    expect(slices).toEqual([
      { start: 0, end: 250 },
      { start: 250, end: 500 },
      { start: 500, end: 600 },
    ]);
  });

  it("falls back to a single full-height slice when no blocks are measured", () => {
    expect(paginate([], [], 500, 250)).toEqual([{ start: 0, end: 500 }]);
  });
});
