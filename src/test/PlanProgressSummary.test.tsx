import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PlanProgressSummary from "../components/views/plan/PlanProgressSummary";
import type { TripPlan } from "../core/utils/tripPlans";

function mkPlan(labels: string[], overrides: Partial<TripPlan> = {}): TripPlan {
  return {
    duration: `${labels.length} days`,
    costPerPerson: "₹1.2L – ₹2L",
    days: labels.map((label) => ({ label, activities: [] })),
    note: "",
    costBasis: "couple",
    ...overrides,
  };
}

describe("PlanProgressSummary", () => {
  it("pluralizes the place count and links cities with arrows", () => {
    render(<PlanProgressSummary plan={mkPlan(["Day 1 — Oslo", "Day 2 — Bergen"])} />);
    expect(screen.getByText("2 days")).toBeInTheDocument();
    expect(screen.getByText("2 places")).toBeInTheDocument();
    expect(screen.getByText("Oslo")).toBeInTheDocument();
    expect(screen.getByText("Bergen")).toBeInTheDocument();
  });

  it("uses the singular 'place' when the plan visits exactly one city", () => {
    render(<PlanProgressSummary plan={mkPlan(["Day 1 — Oslo", "Day 2 — Oslo"])} />);
    expect(screen.getByText("1 place")).toBeInTheDocument();
    expect(screen.queryByText("1 places")).not.toBeInTheDocument();
  });

  it("omits the city rail entirely when no city can be parsed from the days", () => {
    render(<PlanProgressSummary plan={mkPlan(["Day 1", "Day 2"])} />);
    expect(screen.getByText("0 places")).toBeInTheDocument();
    // No city chips render when there is nothing to show.
    expect(screen.queryByText("→")).not.toBeInTheDocument();
  });

  it("shows the per-person basis label for AI plans without a party basis", () => {
    render(<PlanProgressSummary plan={mkPlan(["Day 1 — Rome"], { costBasis: undefined })} />);
    expect(screen.getByLabelText("per person")).toBeInTheDocument();
  });
});
