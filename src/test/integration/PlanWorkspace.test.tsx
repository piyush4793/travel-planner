import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { PlanBuilder } from "../../hooks/usePlanBuilder";
import type { Country, CityEntry } from "../../core/types";
import type { TripPlan } from "../../core/utils/tripPlans";
import type { CountryRule } from "../../core/data/itineraryRules";

const bpMock = vi.hoisted(() => ({ value: "desktop" as "desktop" | "tablet" | "mobile" }));
vi.mock("../../hooks/useBreakpoint", () => ({
  useBreakpoint: () => bpMock.value,
}));

import PlanWorkspace from "../../components/views/plan/PlanWorkspace";

const CITIES: CityEntry[] = [{ name: "Alpha", lat: 1, lng: 1, experiences: ["Beaches"] }];

const COUNTRY: Country = {
  name: "Testland",
  lat: 0,
  lng: 0,
  budget: "₹1L",
  experiences: ["Beaches"],
  budgetBreakdown: { solo: "₹1L", couple: "₹2L", family4: "₹3L" },
  bestMonths: ["June"],
  cities: CITIES,
};

const PLAN: TripPlan = {
  duration: "3 days",
  costPerPerson: "₹2L",
  costBasis: "couple",
  note: "",
  days: [{ label: "Day 1 — Alpha", activities: ["Beach walk"] }],
};

const RULE = { cityOrder: ["Alpha"], cities: {}, connections: [] } as unknown as CountryRule;

function makeBuilder(): PlanBuilder {
  return {
    displayCountry: COUNTRY,
    rule: RULE,
    ruleLoading: false,
    maxDays: 12,
    recDays: 7,
    safeMaxDays: 12,
    primaryStyle: "explorer",
    selectedCities: [],
    selectedExperiences: [],
    customDays: 3,
    daysPinned: false,
    recommendedDays: 3,
    orderedCities: CITIES,
    plan: PLAN,
    planCities: ["Alpha"],
    autoSelectedCities: ["Alpha"],
    projectCities: () => ["Alpha"],
    toggleCity: vi.fn(),
    toggleExperience: vi.fn(),
    clearCities: vi.fn(),
    clearExperiences: vi.fn(),
    setDays: vi.fn(),
    resetDays: vi.fn(),
  };
}

function renderWorkspace() {
  return render(
    <PlanWorkspace
      builder={makeBuilder()}
      budgetBasis="couple"
      setBudgetBasis={vi.fn()}
      homeCountry="India"
      actions={{ isVisited: false, isFavorite: false, aiPlanCount: 0, notes: "" }}
    />,
  );
}

describe("PlanWorkspace — responsive Review layout", () => {
  beforeEach(() => {
    localStorage.clear();
    Element.prototype.scrollIntoView = vi.fn();
    bpMock.value = "desktop";
  });

  it("renders both rails inline on desktop with the itinerary in the centre", () => {
    renderWorkspace();
    expect(screen.getByRole("complementary", { name: /Shape your trip/i })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: /Good to know/i })).toBeInTheDocument();
    // No bottom-sheet triggers on desktop.
    expect(screen.queryByRole("button", { name: /Shape trip/i })).not.toBeInTheDocument();
  });

  it("collapses a rail and persists the choice", () => {
    renderWorkspace();
    fireEvent.click(screen.getByRole("button", { name: /Collapse Shape your trip panel/i }));
    expect(screen.queryByRole("complementary", { name: /Shape your trip/i })).not.toBeInTheDocument();
    // A reopen tab appears in its place.
    expect(screen.getByRole("button", { name: /Show Shape panel/i })).toBeInTheDocument();
  });

  it("shows drawer triggers instead of inline rails on mobile", () => {
    bpMock.value = "mobile";
    renderWorkspace();
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Shape trip/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Good to know/i })).toBeInTheDocument();
  });

  it("opens a bottom-sheet drawer when a mobile trigger is tapped", () => {
    bpMock.value = "mobile";
    renderWorkspace();
    fireEvent.click(screen.getByRole("button", { name: /Shape trip/i }));
    const dialog = screen.getByRole("dialog", { name: /Shape your trip/i });
    expect(dialog).toBeInTheDocument();
    // Closes via the drawer's close button.
    fireEvent.click(screen.getByRole("button", { name: /Close panel/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
