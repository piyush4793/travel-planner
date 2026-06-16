import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TripsView from "../../components/views/TripsView";
import type { Country } from "../../core/types";

vi.mock("../../hooks/useBreakpoint", () => ({
  useBreakpoint: () => "desktop",
}));

vi.mock("../../utils/wikiImages", () => ({
  getWikiImage: vi.fn().mockResolvedValue(null),
}));

function createCountry(overrides: Partial<Country>): Country {
  return {
    name: "Country",
    lat: 0,
    lng: 0,
    region: "Europe",
    popularityScore: 0,
    bestMonths: ["April"],
    budget: "₹1L–₹2L",
    experiences: ["Food"],
    ...overrides,
  };
}

const countries: Country[] = [
  createCountry({ name: "Sweden", popularityScore: 95, combo: ["Norway"] }),
  createCountry({ name: "Switzerland", popularityScore: 10, combo: ["France"] }),
  createCountry({ name: "Japan", popularityScore: 80, region: "Asia", budgetBreakdown: { solo: "₹1L", couple: "₹2L", family4: "₹3L" } }),
];

function renderTrips(onSelect = vi.fn()) {
  return {
    onSelect,
    ...render(
      <TripsView
        countries={countries}
        visitedNames={new Set<string>()}
        favorites={new Set<string>()}
        visitedFilter="all"
        setVisitedFilter={vi.fn()}
        selectedMonth={[]}
        setMonth={vi.fn()}
        budgetFilter="all"
        setBudgetFilter={vi.fn()}
        budgetBasis="couple"
        setBudgetBasis={vi.fn()}
        onSelect={onSelect}
        tripGroups={[]}
        onSaveTrip={vi.fn()}
        onDeleteTrip={vi.fn()}
      />,
    ),
  };
}

describe("TripsView", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1280 });
  });

  it("filters trips by search and supports quick reset", async () => {
    const user = userEvent.setup();
    renderTrips();

    const searchInput = screen.getByPlaceholderText("Search countries, cities...");
    expect(screen.getByRole("button", { name: "Sweden" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Switzerland" })).toBeInTheDocument();

    await user.type(searchInput, "swit");

    expect(screen.getByRole("button", { name: "Switzerland" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sweden" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear all" }));
    expect(searchInput).toHaveValue("");
    expect(screen.getByRole("button", { name: "Sweden" })).toBeInTheDocument();
  });

  it("supports list/grid toggles, sort updates, and card selection", async () => {
    const user = userEvent.setup();
    const { onSelect } = renderTrips();

    await user.click(screen.getByRole("button", { name: "List view" }));
    expect(screen.getByTitle("List view")).toHaveClass("bg-blue-50");

    await user.selectOptions(screen.getByTitle("Sort trips"), "az");
    expect(screen.getByText(/Sorted A to Z/i)).toBeInTheDocument();
    expect(screen.getByText(/Budget shown for/i)).toHaveTextContent("Budget shown for 👫 Couple");

    await user.click(screen.getAllByRole("button", { name: "Japan" })[0]);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: "Japan" }));

    await user.click(screen.getByRole("button", { name: "Grid view" }));
    expect(screen.getByTitle("Grid view")).toHaveClass("bg-blue-50");
  });
});
