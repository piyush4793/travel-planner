import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import Filters from "../../components/shared/Filters";

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

  it("renders the month, experience, visited, and budget controls", () => {
    render(
      <Filters
        selectedMonth={[]}
        setMonth={vi.fn()}
        activeExperiences={[]}
        allExperiences={["Temples", "Food"]}
        setExperiences={vi.fn()}
        visitedFilter="all"
        setVisitedFilter={vi.fn()}
        budgetFilter="all"
        setBudgetFilter={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /^month/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^budget/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^experiences/i })).toBeInTheDocument();

    const visitedSelect = screen.getByRole("combobox");
    expect(visitedSelect).toBeInTheDocument();
    expect(within(visitedSelect).getByRole("option", { name: "✓ Visited" })).toBeInTheDocument();
  });
});
