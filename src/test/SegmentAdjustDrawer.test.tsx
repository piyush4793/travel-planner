import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import SegmentAdjustDrawer from "../components/views/plan/SegmentAdjustDrawer";
import type { ReviewSegment } from "../components/views/plan/TripReviewCanvas";
import type { CityEntry, Country } from "../core/types";
import type { TripPlan } from "../core/utils/tripPlans";

function plan(days: number): TripPlan {
  return {
    duration: `${days} days`,
    costPerPerson: "₹1L – ₹2L",
    days: Array.from({ length: days }, (_, i) => ({ label: `Day ${i + 1}`, activities: ["Explore"] })),
    note: "",
    costBasis: "couple",
  };
}

function segment(over: Partial<ReviewSegment> = {}): ReviewSegment {
  return {
    name: "Norway",
    rule: null,
    plan: plan(3),
    customDays: 3,
    recommendedDays: 3,
    maxDays: 20,
    daysPinned: false,
    selectedCities: [],
    autoSelectedCities: ["Oslo"],
    orderedCities: [{ name: "Oslo" } as CityEntry, { name: "Bergen" } as CityEntry],
    experienceOptions: ["Fjords", "Food"],
    selectedExperiences: ["Fjords"],
    projectCities: () => ["Oslo"],
    setDays: vi.fn(),
    resetDays: vi.fn(),
    toggleCity: vi.fn(),
    clearCities: vi.fn(),
    toggleExperience: vi.fn(),
    clearExperiences: vi.fn(),
    ...over,
  };
}

const country: Country = {
  name: "Norway",
  lat: 60,
  lng: 10,
  bestMonths: ["June", "July"],
  worstMonths: ["January"],
  avoid: ["Peak-season crowds"],
  stopoverNote: "Great add-on from Copenhagen.",
  combo: ["Sweden"],
  budget: "",
  experiences: [],
};

describe("SegmentAdjustDrawer", () => {
  it("shows only the Shape controls when the stop has no detail data", () => {
    render(<SegmentAdjustDrawer segment={segment()} onClose={vi.fn()} />);
    expect(screen.queryByRole("tab", { name: "Details" })).not.toBeInTheDocument();
    expect(screen.getByText("Focus experiences")).toBeInTheDocument();
    expect(screen.getByText("Cities to visit")).toBeInTheDocument();
    expect(screen.getAllByText("Trip length").length).toBeGreaterThan(0);
  });

  it("fires the shaping handlers from the Shape tab", () => {
    const toggleExperience = vi.fn();
    const toggleCity = vi.fn();
    render(<SegmentAdjustDrawer segment={segment({ toggleExperience, toggleCity })} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Food" }));
    expect(toggleExperience).toHaveBeenCalledWith("Food");
    fireEvent.click(screen.getByRole("button", { name: /Bergen/ }));
    expect(toggleCity).toHaveBeenCalledWith("Bergen");
  });

  it("exposes a Details tab with per-stop reference when country data exists", () => {
    render(<SegmentAdjustDrawer segment={segment({ country })} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("tab", { name: "Details" }));
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getByText("June · July")).toBeInTheDocument();
    expect(within(panel).getByText("Peak-season crowds")).toBeInTheDocument();
    expect(within(panel).getByText("Great add-on from Copenhagen.")).toBeInTheDocument();
    expect(within(panel).getByText(/Sweden/)).toBeInTheDocument();
  });

  it("closes via the close button", () => {
    const onClose = vi.fn();
    render(<SegmentAdjustDrawer segment={segment()} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Close adjust Norway" }));
    expect(onClose).toHaveBeenCalled();
  });
});
