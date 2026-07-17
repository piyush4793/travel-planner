import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ItineraryView from "@/components/country/itinerary/ItineraryView.tsx";
import type { TripPlan } from "@/core/utils/tripPlans.ts";
import type { CountryRule } from "@/core/data/itineraryRules.ts";

const bpRef = vi.hoisted(() => ({ current: "desktop" as "desktop" | "tablet" | "mobile" }));
vi.mock("@/hooks/useBreakpoint.ts", () => ({ useBreakpoint: () => bpRef.current }));

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

  it("expands a transport mode comparison when the connection carries modes", () => {
    const ruleWithModes: CountryRule = {
      ...rule,
      connections: [
        {
          from: "Tokyo",
          to: "Kyoto",
          method: "Shinkansen bullet train",
          cost: "₹8K",
          modes: [
            { mode: "train", duration: "2.5 hrs", cost: "₹8,000 pp", note: "Nozomi service" },
            { mode: "flight", duration: "1 hr", cost: "₹6,000 pp" },
          ],
          skipped: "Bus is far slower on this leg.",
        },
      ],
    };
    render(<ItineraryView plan={plan} rule={ruleWithModes} country="Japan" />);

    const toggle = screen.getByRole("button", { name: /Compare 2 ways to travel/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    expect(screen.getByText("Train")).toBeInTheDocument();
    expect(screen.getByText("Flight")).toBeInTheDocument();
    expect(screen.getByText(/2\.5 hrs/)).toBeInTheDocument();
    expect(screen.getByText("₹6,000 pp")).toBeInTheDocument();
    expect(screen.getByText(/Skipped: Bus is far slower/)).toBeInTheDocument();
    // Curated fares/times still go stale, so live-search links sit below the
    // curated modes and are qualified by country for accurate results.
    const rome2rio = screen.getByRole("link", { name: /Compare all routes/ });
    expect(rome2rio).toHaveAttribute("href", expect.stringContaining("rome2rio.com/map"));
    expect(rome2rio).toHaveAttribute("href", expect.stringContaining("Japan"));
    expect(rome2rio).toHaveAttribute("rel", "noopener noreferrer");
    const directions = screen.getByRole("link", { name: /Directions/ });
    expect(directions).toHaveAttribute("href", expect.stringContaining("maps/dir"));
  });

  it("offers live transport links even when a leg has no curated connection data", () => {
    // The gap the traveller flagged (e.g. Loen → Geirangerfjord): no static
    // connection, so the separator now hands off to always-current search tools
    // instead of rendering a dead "City → City" row. No maintenance burden.
    const ruleNoConn: CountryRule = { ...rule, connections: [] };
    render(<ItineraryView plan={plan} rule={ruleNoConn} country="Japan" />);

    const toggle = screen.getByRole("button", { name: /Check live times & fares/ });
    fireEvent.click(toggle);
    const rome2rio = screen.getByRole("link", { name: /Compare all routes/ });
    // City endpoints are country-qualified so "Tokyo, Japan" → "Kyoto, Japan".
    expect(rome2rio).toHaveAttribute("href", expect.stringMatching(/Tokyo.*Japan/));
    expect(screen.getByRole("link", { name: /Directions/ })).toBeInTheDocument();
  });
});

describe("ItineraryView — enriched feasibility pattern", () => {
  afterEach(() => {
    cleanup();
    bpRef.current = "desktop";
  });

  const richPlan: TripPlan = {
    duration: "1 day",
    costPerPerson: "₹1L",
    note: "Visa: on arrival.",
    days: [
      {
        label: "Day 1 — Oslo",
        theme: "City Icons",
        pace: "moderate",
        planNote: "All walkable — buy a 24h Ruter ticket.",
        activities: ["Vigeland Park — 212 works (Free)", "Karl Johans Gate"],
        details: [
          { name: "Vigeland Park — 212 works", priority: "must-see", duration: "1.5–2h", cost: "Free", tip: "Go by 9am for the Monolith." },
          { name: "Karl Johans Gate", priority: "optional", duration: "45min", cost: "Free", tip: "Skip if tired." },
        ],
        stays: [
          { name: "Citybox Oslo", price: "₹9–14k", tier: "budget" },
          { name: "Thon Opera", price: "₹16–24k", tier: "mid" },
          { name: "The Thief", price: "₹40–70k", tier: "premium" },
        ],
      },
    ],
  };

  it("renders pace badge, plan note, priority words, durations and inline tips on desktop", () => {
    render(<ItineraryView plan={richPlan} />);
    expect(screen.getByText("Moderate")).toBeInTheDocument();
    expect(screen.getByText(/buy a 24h Ruter ticket/)).toBeInTheDocument();
    expect(screen.getByText(/Must-see/)).toBeInTheDocument();
    expect(screen.getByText(/Optional/)).toBeInTheDocument();
    expect(screen.getByText(/1.5–2h/)).toBeInTheDocument();
    // Tip is inline on desktop (no toggle button).
    expect(screen.getByText(/Go by 9am/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Tap for tip/ })).not.toBeInTheDocument();
  });

  it("shows tiered Where-to-stay tabs and switches the shown stay on tab change", () => {
    render(<ItineraryView plan={richPlan} />);
    expect(screen.getByText("Where to stay")).toBeInTheDocument();
    // Budget tier active by default.
    expect(screen.getByRole("link", { name: "Citybox Oslo" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "The Thief" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Premium" }));
    expect(screen.getByRole("link", { name: "The Thief" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Citybox Oslo" })).not.toBeInTheDocument();
  });

  it("collapses tips behind a Tap-for-tip toggle on mobile", () => {
    bpRef.current = "mobile";
    render(<ItineraryView plan={richPlan} />);
    expect(screen.queryByText(/Go by 9am/)).not.toBeInTheDocument();
    const toggle = screen.getAllByRole("button", { name: /Tap for tip/ })[0];
    fireEvent.click(toggle);
    expect(screen.getByText(/Go by 9am/)).toBeInTheDocument();
  });

  it("falls back to flat activity strings and hotel pills when unenriched", () => {
    const plainPlan: TripPlan = {
      duration: "1 day",
      costPerPerson: "₹1L",
      note: "n",
      days: [{ label: "Day 1 — Bali", activities: ["Beach walk"], hotels: ["Villa — ₹8k"] }],
    };
    render(<ItineraryView plan={plainPlan} />);
    expect(screen.getByText("Beach walk")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Villa/ })).toBeInTheDocument();
    expect(screen.queryByText("Where to stay")).not.toBeInTheDocument();
  });
});
