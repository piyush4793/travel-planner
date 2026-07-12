import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import Filters from "@/components/shared/Filters.tsx";

vi.mock("maplibre-gl", () => ({
  default: { Map: vi.fn(), Marker: vi.fn() },
  Map: vi.fn(),
  Marker: vi.fn(),
}));

describe("Filters", () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = "";
    const portal = document.createElement("div");
    portal.id = "portal-root";
    document.body.appendChild(portal);
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the month, visited, and budget controls", () => {
    render(
      <Filters
        selectedMonth={[]}
        setMonth={vi.fn()}
        visitedFilter="all"
        setVisitedFilter={vi.fn()}
        budgetFilter="all"
        setBudgetFilter={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /^month/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^budget/i })).toBeInTheDocument();

    const visitedSelect = screen.getByRole("combobox");
    expect(visitedSelect).toBeInTheDocument();
    expect(within(visitedSelect).getByRole("option", { name: "✓ Visited" })).toBeInTheDocument();
  });
});
