import { describe, it, expect } from "vitest";
import { buildShareText } from "../components/country/panel/ShareButton";
import type { Country } from "../core/types";
import type { TripPlan } from "../core/utils/tripPlans";

const COUNTRY: Country = {
  name: "India",
  lat: 20.59,
  lng: 78.96,
  bestMonths: ["October", "November"],
  budget: "₹1L–₹2L",
  experiences: ["Temples", "Food"],
  cities: [
    { name: "Delhi", lat: 28.6, lng: 77.2 },
    { name: "Jaipur", lat: 26.9, lng: 75.8 },
  ],
  combo: ["Nepal"],
  notes: "Carry cash",
};

const PLAN: TripPlan = {
  duration: "3 days",
  costPerPerson: "₹36K – ₹63K",
  days: [
    { label: "Day 1 — Delhi", theme: "Old Delhi", activities: ["Red Fort"] },
    { label: "Day 2 — Delhi", theme: "New Delhi", activities: ["India Gate"] },
    { label: "Day 3 — Jaipur", theme: "Pink City", activities: ["Amber Fort"] },
  ],
  note: "Delhi → Jaipur: train",
};

describe("buildShareText", () => {
  it("builds a summary without a plan (city list, no itinerary)", () => {
    const text = buildShareText(COUNTRY, "India");
    expect(text).toContain("✈️ India");
    expect(text).toContain("From: India");
    expect(text).toContain("Cities: Delhi, Jaipur");
    expect(text).toContain("Combine with: Nepal");
    expect(text).toContain("Notes: Carry cash");
    expect(text).not.toContain("Day-by-day:");
    expect(text).not.toContain("Route:");
  });

  it("includes duration, cost, route and day-by-day when a plan is provided", () => {
    const text = buildShareText(COUNTRY, "India", PLAN);
    expect(text).toContain("📅 3 days · 💰 ₹36K – ₹63K / person");
    expect(text).toContain("Route: Delhi → Jaipur");
    expect(text).toContain("Day-by-day:");
    expect(text).toContain("Day 1 — Delhi: Old Delhi");
    expect(text).toContain("Day 3 — Jaipur: Pink City");
  });

  it("omits the flat city list when a plan is present (avoids duplication)", () => {
    const text = buildShareText(COUNTRY, "India", PLAN);
    expect(text).not.toContain("Cities: Delhi, Jaipur");
  });
});
