import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ItineraryView from "@/components/country/itinerary/ItineraryView.tsx";
import type { TripPlan } from "@/core/utils/tripPlans.ts";
import type { CountryRule } from "@/core/data/itineraryRules.ts";

const plan: TripPlan = {
  duration: "3 days",
  costPerPerson: "₹50K",
  note: "Visa: on arrival. Currency: JPY.",
  days: [
    { label: "Day 1 — Tokyo", theme: "City lights", activities: ["Shibuya Crossing (₹0)", "Sushi tasting — omakase"], hotels: ["Park Hotel — mid"] },
    { label: "Day 2 — Kyoto", theme: "Temples", activities: ["Fushimi Inari"] },
  ],
};

const rule: CountryRule = {
  cityOrder: ["Tokyo", "Kyoto"],
  cities: {
    Tokyo: {
      name: "Tokyo",
      minDays: 1,
      recDays: 2,
      maxDays: 4,
      days: [{ theme: "City lights", activities: [{ name: "Shibuya Crossing" }], meals: ["Ichiran Ramen"] }],
    },
    Kyoto: {
      name: "Kyoto",
      minDays: 1,
      recDays: 2,
      maxDays: 3,
      days: [{ theme: "Temples", activities: [{ name: "Fushimi Inari" }] }],
    },
  },
  connections: [{ from: "Tokyo", to: "Kyoto", method: "Shinkansen bullet train", cost: "₹8K" }],
};

describe("ItineraryView", () => {
  afterEach(() => cleanup());

  it("renders per-city groups, the transport separator, meals and hotels", () => {
    render(<ItineraryView plan={plan} rule={rule} />);

    expect(screen.getByText("Tokyo")).toBeInTheDocument();
    expect(screen.getByText("Kyoto")).toBeInTheDocument();
    // Transport separator between the two cities.
    expect(screen.getByText("Tokyo → Kyoto")).toBeInTheDocument();
    expect(screen.getByText("Shinkansen bullet train")).toBeInTheDocument();
    expect(screen.getByText("₹8K")).toBeInTheDocument();
    // Meals come from the matching rule day.
    expect(screen.getByRole("link", { name: "Ichiran Ramen" })).toBeInTheDocument();
    // Hotels render as booking links.
    expect(screen.getByRole("link", { name: /Park Hotel/ })).toBeInTheDocument();
    // Practical notes parsed from plan.note.
    expect(screen.getByText(/Visa/)).toBeInTheDocument();
  });

  it("copies the day route link and shows a transient confirmation", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<ItineraryView plan={plan} rule={rule} />);

    const copyBtn = screen.getAllByTitle("Copy route link")[0];
    fireEvent.click(copyBtn);

    expect(writeText).toHaveBeenCalled();
    await waitFor(() => expect(screen.getAllByTitle("Copied!").length).toBeGreaterThan(0));
  });
});
