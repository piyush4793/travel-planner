import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import TripReviewCanvas, { type ReviewSegment } from "../components/views/plan/TripReviewCanvas";
import ItineraryToolbar from "../components/views/plan/ItineraryToolbar";
import type { Country } from "../core/types";
import type { CityEntry } from "../core/types";
import type { TripPlan } from "../core/utils/tripPlans";

function plan(city: string, days: number): TripPlan {
  return {
    duration: `${days} days`,
    costPerPerson: "₹1L – ₹2L",
    days: Array.from({ length: days }, (_, i) => ({
      label: `Day ${i + 1} — ${city}`,
      activities: [`Explore ${city}`],
    })),
    note: "",
    costBasis: "couple",
  };
}

function segment(name: string, city: string, days: number, overrides: Partial<ReviewSegment> = {}): ReviewSegment {
  return {
    name,
    rule: null,
    plan: plan(city, days),
    customDays: days,
    recommendedDays: days,
    maxDays: 30,
    daysPinned: false,
    selectedCities: [],
    autoSelectedCities: [city],
    orderedCities: [{ name: city } as CityEntry],
    experienceOptions: [],
    selectedExperiences: [],
    projectCities: () => [city],
    setDays: vi.fn(),
    resetDays: vi.fn(),
    toggleCity: vi.fn(),
    clearCities: vi.fn(),
    toggleExperience: vi.fn(),
    clearExperiences: vi.fn(),
    ...overrides,
  };
}

const country: Country = { name: "Norway", lat: 0, lng: 0, bestMonths: [], budget: "", experiences: [] };

const composed: TripPlan = {
  duration: "6 days",
  costPerPerson: "₹2L – ₹4L",
  days: [...plan("Oslo", 3).days, ...plan("Copenhagen", 3).days],
  note: "A 2-stop route: Norway → Denmark.",
  costBasis: "couple",
};

type CanvasProps = React.ComponentProps<typeof TripReviewCanvas>;

// The canvas no longer builds the toolbar (the workspace does, so it can also
// live in the mobile "Actions" sheet). Tests pass a real ItineraryToolbar as the
// `toolbar` prop; `composedPlan` here only feeds that default toolbar.
function renderCanvas(
  props: Partial<CanvasProps> & Pick<CanvasProps, "segments"> & { composedPlan?: TripPlan },
) {
  const { composedPlan, toolbar, ...rest } = props;
  const anchorName = rest.anchorName ?? rest.segments[0]?.name ?? "";
  return render(
    <TripReviewCanvas
      anchorName={anchorName}
      onSetAnchor={vi.fn()}
      onReorder={vi.fn()}
      onAutoArrange={vi.fn()}
      canAutoArrange={false}
      toolbar={toolbar ?? <ItineraryToolbar country={country} plan={composedPlan ?? plan("Oslo", 3)} homeCountry="India" />}
      {...rest}
    />,
  );
}

describe("TripReviewCanvas", () => {
  it("renders one block per stop with an honest border hop between countries", () => {
    renderCanvas({ segments: [segment("Norway", "Oslo", 3), segment("Denmark", "Copenhagen", 3)], composedPlan: composed });
    expect(screen.getByRole("heading", { name: /^Norway/, level: 3 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Denmark", level: 3 })).toBeInTheDocument();
    expect(screen.getByText("Travel from Norway to Denmark")).toBeInTheDocument();
    expect(screen.queryByText(/Travel from .* to Norway/)).not.toBeInTheDocument();
  });

  it("expands a border hop into an informational mode picker", () => {
    renderCanvas({
      segments: [
        segment("Norway", "Oslo", 3, { point: { lat: 60, lng: 10 } }),
        segment("Denmark", "Copenhagen", 3, { point: { lat: 55, lng: 12 } }),
      ],
      composedPlan: composed,
    });
    const hop = screen.getByRole("button", { name: /Travel from Norway to Denmark/ });
    expect(hop).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(hop);
    expect(hop).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Flight")).toBeInTheDocument();
    expect(screen.getByText(/times are indicative/)).toBeInTheDocument();
  });

  it("opens a stop's Adjust drawer on demand", () => {
    renderCanvas({ segments: [segment("Norway", "Oslo", 3)], composedPlan: plan("Oslo", 3) });
    const toggle = screen.getByRole("button", { name: "Adjust Norway" });
    expect(toggle).toHaveAttribute("aria-haspopup", "dialog");
    expect(screen.queryByRole("dialog", { name: "Adjust Norway" })).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.getByRole("dialog", { name: "Adjust Norway" })).toBeInTheDocument();
  });

  it("exposes Focus + Cities pickers in the Adjust drawer and fires their handlers", () => {
    const toggleExperience = vi.fn();
    const toggleCity = vi.fn();
    renderCanvas({
      segments: [
        segment("Norway", "Oslo", 3, {
          experienceOptions: ["Fjords", "Food"],
          selectedExperiences: ["Fjords"],
          orderedCities: [{ name: "Oslo" } as CityEntry, { name: "Bergen" } as CityEntry],
          autoSelectedCities: ["Oslo"],
          toggleExperience,
          toggleCity,
        }),
      ],
      composedPlan: plan("Oslo", 3),
    });
    fireEvent.click(screen.getByRole("button", { name: "Adjust Norway" }));
    const drawer = screen.getByRole("dialog", { name: "Adjust Norway" });
    fireEvent.click(within(drawer).getByRole("button", { name: "Food" }));
    expect(toggleExperience).toHaveBeenCalledWith("Food");
    fireEvent.click(within(drawer).getByRole("button", { name: /Bergen/ }));
    expect(toggleCity).toHaveBeenCalledWith("Bergen");
  });

  it("surfaces a stop's warning attributed to its own segment", () => {
    const warned = segment("Norway", "Oslo", 3);
    warned.plan = { ...warned.plan, warning: "8 days is tight for 8 cities — expanded to 11." };
    renderCanvas({ segments: [warned], composedPlan: warned.plan });
    expect(screen.getByText(/8 days is tight for 8 cities/)).toBeInTheDocument();
  });

  it("pins the provided action toolbar on desktop", () => {
    renderCanvas({ segments: [segment("Norway", "Oslo", 3), segment("Denmark", "Copenhagen", 3)], composedPlan: composed });
    expect(screen.getByRole("button", { name: "Export this itinerary as a PDF" })).toBeInTheDocument();
  });

  it("names each stop with its own day count in its header", () => {
    renderCanvas({ segments: [segment("Norway", "Oslo", 3), segment("Denmark", "Copenhagen", 5)], composedPlan: composed });
    const denmark = screen.getByRole("region", { name: /Denmark — stop 2 of 2/ });
    expect(within(denmark).getByRole("button", { name: "Adjust Denmark" })).toHaveTextContent("5d");
  });

  it("badges the anchor stop and offers to promote a non-anchor stop", () => {
    const onSetAnchor = vi.fn();
    renderCanvas({
      segments: [segment("Norway", "Oslo", 3), segment("Denmark", "Copenhagen", 3)],
      composedPlan: composed,
      anchorName: "Norway",
      onSetAnchor,
    });
    const norway = screen.getByRole("region", { name: /Norway — stop 1 of 2/ });
    expect(within(norway).getByText(/anchor stop/i)).toBeInTheDocument();
    // Anchor selection lives in the trip-level route-order lever.
    fireEvent.click(screen.getByRole("button", { name: "Edit route order" }));
    fireEvent.click(screen.getByRole("button", { name: "Make Denmark the anchor" }));
    expect(onSetAnchor).toHaveBeenCalledWith("Denmark");
  });

  it("expands the anchor by default and collapses the rest", () => {
    renderCanvas({
      segments: [segment("Norway", "Oslo", 3), segment("Denmark", "Copenhagen", 3)],
      composedPlan: composed,
      anchorName: "Norway",
    });
    expect(screen.getByText("Day 1 — Oslo")).toBeInTheDocument();
    expect(screen.queryByText(/Day \d+ — Copenhagen/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Expand Denmark itinerary" }));
    // Second stop's day cards continue the route timeline (Norway = 3 days), so
    // Copenhagen starts at Day 4, not a per-stop restart at Day 1.
    expect(screen.getByText("Day 4 — Copenhagen")).toBeInTheDocument();
    expect(screen.queryByText("Day 1 — Copenhagen")).not.toBeInTheDocument();
  });

  it("shows cumulative route-relative day ranges per stop", () => {
    renderCanvas({ segments: [segment("Norway", "Oslo", 3), segment("Denmark", "Copenhagen", 5)], composedPlan: composed });
    expect(screen.getByText("Days 1–3")).toBeInTheDocument();
    expect(screen.getByText("Days 4–8")).toBeInTheDocument();
  });

  it("surfaces the per-stop budget in the header row", () => {
    renderCanvas({ segments: [segment("Norway", "Oslo", 3), segment("Denmark", "Copenhagen", 5)], composedPlan: composed });
    const norway = screen.getByRole("region", { name: /Norway — stop 1 of 2/ });
    // Cost moved into the balanced row-2 stats line (was crowding row 1 before).
    expect(within(norway).getByText("₹1L – ₹2L")).toBeInTheDocument();
  });

  it("reorders a stop via the route-order lever", () => {
    const onReorder = vi.fn();
    renderCanvas({ segments: [segment("Norway", "Oslo", 3), segment("Denmark", "Copenhagen", 3)], composedPlan: composed, onReorder });
    fireEvent.click(screen.getByRole("button", { name: "Edit route order" }));
    fireEvent.keyDown(screen.getByRole("button", { name: /Reorder Denmark/ }), { key: "ArrowUp" });
    expect(onReorder).toHaveBeenCalledWith(1, 0);
  });

  it("hides auto-arrange in the route lever unless enabled", () => {
    const segs = [segment("Norway", "Oslo", 3), segment("Denmark", "Copenhagen", 3), segment("Sweden", "Stockholm", 3)];
    renderCanvas({ segments: segs, composedPlan: composed, canAutoArrange: false });
    fireEvent.click(screen.getByRole("button", { name: "Edit route order" }));
    expect(screen.queryByRole("button", { name: /Auto-arrange/ })).not.toBeInTheDocument();
  });

  it("runs auto-arrange from the route lever when enabled", () => {
    const onAutoArrange = vi.fn();
    const segs = [segment("Norway", "Oslo", 3), segment("Denmark", "Copenhagen", 3), segment("Sweden", "Stockholm", 3)];
    renderCanvas({ segments: segs, composedPlan: composed, canAutoArrange: true, onAutoArrange });
    fireEvent.click(screen.getByRole("button", { name: "Edit route order" }));
    fireEvent.click(screen.getByRole("button", { name: /Auto-arrange/ }));
    expect(onAutoArrange).toHaveBeenCalled();
  });
});
