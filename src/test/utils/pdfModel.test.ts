import { describe, it, expect } from "vitest";
import { buildPdfModel, type PdfRouteStop } from "@/utils/pdfModel.ts";
import type { TripPlan } from "@/core/utils/tripPlans.ts";
import type { Country } from "@/core/types.ts";

const COUNTRY: Country = {
  name: "Norway",
  lat: 60.47,
  lng: 8.47,
  bestMonths: ["June", "July"],
  budget: "₹1.5L–₹2L",
  experiences: ["Fjords"],
  cities: [{ name: "Oslo", lat: 59.9, lng: 10.7 }],
};

const day = (label: string, city: string) => ({ label: `${label} — ${city}`, activities: ["Explore"] });

const PLAN: TripPlan = {
  duration: "5 days",
  costPerPerson: "₹1.8L",
  days: [
    day("Day 1", "Oslo"),
    day("Day 2", "Bergen"),
    day("Day 3", "Flåm"),
    day("Day 4", "Stockholm"),
    day("Day 5", "Stockholm"),
  ],
  note: "Schengen visa",
  warning: "Peak season",
};

describe("buildPdfModel", () => {
  it("returns a single section titled after the country when no stops are given", () => {
    const m = buildPdfModel(PLAN, COUNTRY, "India");
    expect(m.multi).toBe(false);
    expect(m.title).toBe("Norway");
    expect(m.sections).toHaveLength(1);
    expect(m.sections[0]).toMatchObject({ name: "Norway", dayStart: 1, dayEnd: 5 });
    expect(m.sections[0].days).toHaveLength(5);
    expect(m.sections[0].bestMonths).toEqual(["June", "July"]);
    expect(m.meta.stopCount).toBe(1);
    expect(m.meta.cityCount).toBe(4);
    expect(m.note).toBe("Schengen visa");
    expect(m.warning).toBe("Peak season");
  });

  it("treats a single explicit stop as non-multi", () => {
    const stops: PdfRouteStop[] = [{ name: "Norway", dayCount: 5 }];
    const m = buildPdfModel(PLAN, COUNTRY, "India", stops);
    expect(m.multi).toBe(false);
    expect(m.title).toBe("Norway");
    expect(m.sections).toHaveLength(1);
  });

  it("slices days per stop and builds a route title for multi-stop trips", () => {
    const stops: PdfRouteStop[] = [
      { name: "Norway", dayCount: 3, cost: "₹1.2L", bestMonths: ["June"] },
      { name: "Sweden", dayCount: 2, cost: "₹60K", bestMonths: ["May"] },
    ];
    const m = buildPdfModel(PLAN, COUNTRY, "India", stops);
    expect(m.multi).toBe(true);
    expect(m.title).toBe("Norway → Sweden");
    expect(m.sections).toHaveLength(2);
    expect(m.sections[0]).toMatchObject({ name: "Norway", dayStart: 1, dayEnd: 3, cost: "₹1.2L" });
    expect(m.sections[0].days).toHaveLength(3);
    expect(m.sections[1]).toMatchObject({ name: "Sweden", dayStart: 4, dayEnd: 5, cost: "₹60K" });
    expect(m.sections[1].days).toHaveLength(2);
    expect(m.meta.stopCount).toBe(2);
  });

  it("threads each stop's own practical note into its section", () => {
    const stops: PdfRouteStop[] = [
      { name: "Norway", dayCount: 3, note: "SIM: Telenor | Vy · DNB" },
      { name: "Sweden", dayCount: 2, note: "SIM: Comviq | SL" },
    ];
    const m = buildPdfModel(PLAN, COUNTRY, "India", stops);
    expect(m.sections[0].note).toBe("SIM: Telenor | Vy · DNB");
    expect(m.sections[1].note).toBe("SIM: Comviq | SL");
  });

  it("scales to an unbounded number of stops (future domestic route)", () => {
    const stops: PdfRouteStop[] = [
      { name: "Goa", dayCount: 2 },
      { name: "Kerala", dayCount: 2 },
      { name: "Rajasthan", dayCount: 1 },
    ];
    const m = buildPdfModel(PLAN, COUNTRY, "India", stops);
    expect(m.title).toBe("Goa → Kerala → Rajasthan");
    expect(m.sections.map((s) => s.days.length)).toEqual([2, 2, 1]);
  });

  it("folds leftover days into the last section when counts undershoot", () => {
    const stops: PdfRouteStop[] = [
      { name: "A", dayCount: 1 },
      { name: "B", dayCount: 1 },
    ];
    const m = buildPdfModel(PLAN, COUNTRY, "India", stops);
    // 5 total days, stops claim 2 → remaining 3 fold into the last section.
    expect(m.sections[0].days).toHaveLength(1);
    expect(m.sections[1].days).toHaveLength(4);
    expect(m.sections[1].dayEnd).toBe(5);
  });

  it("clamps a stop that overshoots the available days", () => {
    const stops: PdfRouteStop[] = [
      { name: "A", dayCount: 10 },
      { name: "B", dayCount: 3 },
    ];
    const m = buildPdfModel(PLAN, COUNTRY, "India", stops);
    expect(m.sections[0].days).toHaveLength(5);
    expect(m.sections[1].days).toHaveLength(0);
    expect(m.sections[1].dayStart).toBe(6);
  });

  it("carries the country's diet block into the single-stop section", () => {
    const withDiet: Country = {
      ...COUNTRY,
      diet: { vegetarian: "Very veg-friendly", vegan: "Ask no ghee", phrases: ["Bina ghee"] },
    };
    const m = buildPdfModel(PLAN, withDiet, "India");
    expect(m.sections[0].diet).toEqual({
      vegetarian: "Very veg-friendly",
      vegan: "Ask no ghee",
      phrases: ["Bina ghee"],
    });
  });

  it("threads each stop's own diet block into its section", () => {
    const stops: PdfRouteStop[] = [
      { name: "Goa", dayCount: 3, diet: { vegetarian: "Seafood-heavy but veg thalis exist", vegan: "Coconut-based", phrases: [] } },
      { name: "Rajasthan", dayCount: 2, diet: { vegetarian: "Almost all veg", vegan: "No ghee", phrases: ["Bina dahi"] } },
    ];
    const m = buildPdfModel(PLAN, COUNTRY, "India", stops);
    expect(m.sections[0].diet?.vegetarian).toBe("Seafood-heavy but veg thalis exist");
    expect(m.sections[1].diet?.phrases).toEqual(["Bina dahi"]);
  });
});
