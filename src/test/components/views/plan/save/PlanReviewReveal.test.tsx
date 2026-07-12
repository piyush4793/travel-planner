import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PlanReviewReveal from "@/components/views/plan/save/PlanReviewReveal";

describe("PlanReviewReveal", () => {
  const base = { routeName: "Japan → Thailand", days: 12, cities: 6 };

  it("renders nothing when closed", () => {
    render(<PlanReviewReveal open={false} onClose={vi.fn()} {...base} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("celebrates the trip with headline stats and route", () => {
    render(<PlanReviewReveal open onClose={vi.fn()} {...base} />);
    expect(screen.getByRole("dialog", { name: /Your trip is ready/i })).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Japan → Thailand")).toBeInTheDocument();
    expect(screen.getByText(/Saved to My Trips/i)).toBeInTheDocument();
  });

  it("shows the 'planned in Ns' flourish only for a plausible duration", () => {
    const { rerender } = render(<PlanReviewReveal open onClose={vi.fn()} {...base} seconds={18} />);
    expect(screen.getByText(/Planned in 18s/i)).toBeInTheDocument();

    rerender(<PlanReviewReveal open onClose={vi.fn()} {...base} seconds={600} />);
    expect(screen.queryByText(/Planned in/i)).not.toBeInTheDocument();

    rerender(<PlanReviewReveal open onClose={vi.fn()} {...base} />);
    expect(screen.queryByText(/Planned in/i)).not.toBeInTheDocument();
  });

  it("dismisses via the primary action", () => {
    const onClose = vi.fn();
    render(<PlanReviewReveal open onClose={onClose} {...base} />);
    fireEvent.click(screen.getByRole("button", { name: /Explore your itinerary/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
