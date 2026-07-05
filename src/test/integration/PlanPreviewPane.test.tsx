import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PlanPreviewPane from "../../components/views/plan/PlanPreviewPane";
import type { Country } from "../../core/types";
import type { CountryRule } from "../../core/data/itineraryRules";
import type { TripPlan } from "../../core/utils/tripPlans";

const COUNTRY: Country = {
  name: "Norway",
  lat: 60,
  lng: 8,
  bestMonths: ["June"],
  budget: "₹3L",
  experiences: ["Fjords"],
};

const PLAN: TripPlan = {
  duration: "6 days",
  costPerPerson: "₹3L",
  costBasis: "couple",
  note: "",
  days: [
    { label: "Day 1 — Flåm", activities: ["Fjord cruise"] },
    { label: "Day 2 — Flåm", activities: ["Flåm railway"] },
    { label: "Day 3 — Lofoten", activities: ["Reine viewpoint"] },
  ],
};

const RULE = {
  cityOrder: ["Flåm", "Lofoten"],
  cities: {},
  connections: [{ from: "Flåm", to: "Lofoten", method: "Domestic flight", cost: "₹8K" }],
} as unknown as CountryRule;

describe("PlanPreviewPane — city jump nav", () => {
  beforeEach(() => {
    // jsdom has no layout scrolling; stub the API groupDays-driven jump uses.
    Element.prototype.scrollIntoView = vi.fn();
  });

  const renderPane = () =>
    render(
      <PlanPreviewPane
        country={COUNTRY}
        plan={PLAN}
        rule={RULE}
        homeCountry="India"
      />,
    );

  it("renders a clickable jump chip per city with a transport icon between them", () => {
    renderPane();
    const nav = screen.getByRole("navigation", { name: /Jump to city/i });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Jump to Flåm/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Jump to Lofoten/i })).toBeInTheDocument();
    // Transport leg icon carries the method as its tooltip.
    expect(screen.getByTitle("Domestic flight")).toBeInTheDocument();
  });

  it("scrolls to the city section when a jump chip is tapped", () => {
    renderPane();
    fireEvent.click(screen.getByRole("button", { name: /Jump to Lofoten/i }));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });
});

describe("PlanPreviewPane — plan actions", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("offers Cinematic only when a handler is given and ≥2 known cities match", () => {
    const onCinematic = vi.fn();
    const known: Country = { ...COUNTRY, cities: [{ name: "Flåm", lat: 60, lng: 7 }, { name: "Lofoten", lat: 68, lng: 13 }] };
    render(<PlanPreviewPane country={known} plan={PLAN} rule={RULE} homeCountry="India" onCinematic={onCinematic} />);
    const btn = screen.getByRole("button", { name: /Cinematic/i });
    fireEvent.click(btn);
    expect(onCinematic).toHaveBeenCalledTimes(1);
  });

  it("hides Cinematic when the country lacks matching cities", () => {
    render(<PlanPreviewPane country={COUNTRY} plan={PLAN} rule={RULE} homeCountry="India" onCinematic={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /Cinematic/i })).not.toBeInTheDocument();
  });

  it("shows Export PDF (pdfExport flag defaults on)", () => {
    render(<PlanPreviewPane country={COUNTRY} plan={PLAN} rule={RULE} homeCountry="India" />);
    expect(screen.getByRole("button", { name: /Export.*PDF/i })).toBeInTheDocument();
  });
});
