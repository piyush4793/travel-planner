import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ShapeRail from "../../components/views/plan/ShapeRail";
import type { PlanBuilder } from "../../hooks/usePlanBuilder";
import type { Country, CityEntry } from "../../core/types";

const CITIES: CityEntry[] = [
  { name: "Alpha", lat: 1, lng: 1, experiences: ["Beaches"] },
  { name: "Beta", lat: 2, lng: 2, experiences: ["Mountains"] },
];

const COUNTRY: Country = {
  name: "Testland",
  lat: 0,
  lng: 0,
  budget: "₹1L",
  experiences: ["Beaches", "Mountains"],
  cities: CITIES,
  bestMonths: [],
};

function makeBuilder(overrides: Partial<PlanBuilder> = {}): PlanBuilder {
  return {
    displayCountry: COUNTRY,
    rule: null,
    ruleLoading: false,
    maxDays: 12,
    recDays: 7,
    safeMaxDays: 12,
    primaryStyle: "explorer",
    selectedCities: [],
    selectedExperiences: [],
    customDays: 7,
    daysPinned: false,
    recommendedDays: 7,
    orderedCities: CITIES,
    plan: null,
    planCities: ["Alpha"],
    autoSelectedCities: ["Alpha"],
    projectCities: () => ["Alpha"],
    toggleCity: vi.fn(),
    toggleExperience: vi.fn(),
    clearCities: vi.fn(),
    clearExperiences: vi.fn(),
    setDays: vi.fn(),
    resetDays: vi.fn(),
    ...overrides,
  };
}

describe("ShapeRail — left levers", () => {
  it("renders Focus, Cities and Trip length sections", () => {
    render(<ShapeRail builder={makeBuilder()} />);
    expect(screen.getByRole("button", { name: /Focus/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Cities/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Trip length/i })).toBeInTheDocument();
  });

  it("toggles an experience when its chip is pressed", () => {
    const toggleExperience = vi.fn();
    render(<ShapeRail builder={makeBuilder({ toggleExperience })} />);
    fireEvent.click(screen.getByRole("button", { name: "Beaches" }));
    expect(toggleExperience).toHaveBeenCalledWith("Beaches");
  });

  it("marks an active experience with aria-pressed", () => {
    render(<ShapeRail builder={makeBuilder({ selectedExperiences: ["Mountains"] })} />);
    expect(screen.getByRole("button", { name: "Mountains" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Beaches" })).toHaveAttribute("aria-pressed", "false");
  });

  it("clears experiences via the Clear button", () => {
    const clearExperiences = vi.fn();
    render(<ShapeRail builder={makeBuilder({ selectedExperiences: ["Beaches"], clearExperiences })} />);
    fireEvent.click(screen.getByRole("button", { name: /Clear \(1\)/i }));
    expect(clearExperiences).toHaveBeenCalled();
  });

  it("hides the Focus section when the destination has no experiences", () => {
    render(<ShapeRail builder={makeBuilder({ displayCountry: { ...COUNTRY, experiences: [] } })} />);
    expect(screen.queryByRole("button", { name: /Focus/i })).not.toBeInTheDocument();
  });

  it("toggles a city card in the Cities section", () => {
    const toggleCity = vi.fn();
    render(<ShapeRail builder={makeBuilder({ toggleCity })} />);
    fireEvent.click(screen.getByRole("button", { name: "Beta" }));
    expect(toggleCity).toHaveBeenCalledWith("Beta");
  });

  it("shows hand-picked count and resets cities to auto", () => {
    const clearCities = vi.fn();
    render(<ShapeRail builder={makeBuilder({ selectedCities: ["Alpha", "Beta"], clearCities })} />);
    expect(screen.getByText(/2 hand-picked/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Alpha" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: /Reset to auto/i }));
    expect(clearCities).toHaveBeenCalled();
  });
});
