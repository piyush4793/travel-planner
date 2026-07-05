import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import PlanBudgetPanel from "../../components/views/plan/PlanBudgetPanel";
import type { Country } from "../../core/types";

const WITH_BREAKDOWN: Country = {
  name: "Norway",
  lat: 60,
  lng: 8,
  budget: "₹3L",
  experiences: [],
  budgetBreakdown: { solo: "₹2L", couple: "₹3L", family4: "₹5L" },
  bestMonths: ["June"],
};

const NO_BREAKDOWN: Country = {
  name: "Testland",
  lat: 0,
  lng: 0,
  budget: "₹1L",
  experiences: [],
  bestMonths: [],
};

describe("PlanBudgetPanel — per-basis budget", () => {
  it("renders one chip per party size and marks the active basis", () => {
    render(<PlanBudgetPanel country={WITH_BREAKDOWN} activeBasis="couple" onBasisChange={vi.fn()} />);
    const group = screen.getByRole("group", { name: /Budget by traveller basis/i });
    const chips = within(group).getAllByRole("button");
    expect(chips).toHaveLength(3);
    const couple = screen.getByRole("button", { name: /Couple/i });
    expect(couple).toHaveAttribute("aria-pressed", "true");
    const solo = screen.getByRole("button", { name: /Solo/i });
    expect(solo).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onBasisChange when a different basis chip is clicked", () => {
    const onBasisChange = vi.fn();
    render(<PlanBudgetPanel country={WITH_BREAKDOWN} activeBasis="couple" onBasisChange={onBasisChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Family/i }));
    expect(onBasisChange).toHaveBeenCalledWith("family4");
  });

  it("falls back to a single figure when there is no breakdown", () => {
    render(<PlanBudgetPanel country={NO_BREAKDOWN} activeBasis="couple" onBasisChange={vi.fn()} />);
    expect(screen.queryByRole("group", { name: /Budget by traveller basis/i })).not.toBeInTheDocument();
    expect(screen.getByText(/₹1L/)).toBeInTheDocument();
  });
});
