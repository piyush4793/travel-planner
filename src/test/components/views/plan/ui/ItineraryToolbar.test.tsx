import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ItineraryToolbar from "@/components/views/plan/ui/ItineraryToolbar";
import { setFeatureFlag } from "@/core/featureFlags.ts";
import type { Country } from "@/core/types.ts";
import type { TripPlan } from "@/core/utils/tripPlans.ts";

const country: Country = { name: "Japan", lat: 0, lng: 0, bestMonths: [], budget: "", experiences: [] };
const plan: TripPlan = {
  duration: "5 days",
  costPerPerson: "₹1L – ₹2L",
  days: [{ label: "Day 1 — Tokyo", activities: ["x"] }],
  note: "",
  costBasis: "couple",
};

afterEach(() => setFeatureFlag("pdfExport", true));

describe("ItineraryToolbar", () => {
  it("gates Cinematic behind capability + handler (Share now lives in the header)", () => {
    const onCinematic = vi.fn();
    render(
      <ItineraryToolbar country={country} plan={plan} homeCountry="India" canCinematic onCinematic={onCinematic} />,
    );
    expect(screen.queryByRole("button", { name: "Share your trip plan" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Watch the animated cinematic journey" }));
    expect(onCinematic).toHaveBeenCalled();
  });

  it("hides Cinematic when not route-mappable even with a handler", () => {
    render(
      <ItineraryToolbar country={country} plan={plan} homeCountry="India" canCinematic={false} onCinematic={vi.fn()} />,
    );
    expect(screen.queryByRole("button", { name: "Watch the animated cinematic journey" })).not.toBeInTheDocument();
  });

  it("hides PDF when the pdfExport flag is off", () => {
    setFeatureFlag("pdfExport", false);
    render(<ItineraryToolbar country={country} plan={plan} homeCountry="India" />);
    expect(screen.queryByRole("button", { name: "Export this itinerary as a PDF" })).not.toBeInTheDocument();
  });

  it("shows the AI plan action only when a handler is supplied", () => {
    const onPlanWithAi = vi.fn();
    const { rerender } = render(<ItineraryToolbar country={country} plan={plan} homeCountry="India" />);
    expect(screen.queryByRole("button", { name: /Plan this trip with your own AI/ })).not.toBeInTheDocument();
    rerender(<ItineraryToolbar country={country} plan={plan} homeCountry="India" onPlanWithAi={onPlanWithAi} />);
    fireEvent.click(screen.getByRole("button", { name: /Plan this trip with your own AI/ }));
    expect(onPlanWithAi).toHaveBeenCalled();
  });

  it("renders nothing when no action is available", () => {
    setFeatureFlag("pdfExport", false);
    const { container } = render(<ItineraryToolbar country={country} plan={plan} homeCountry="India" />);
    expect(container).toBeEmptyDOMElement();
  });
});
