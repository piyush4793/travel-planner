import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TripsView from "../../components/views/TripsView";
import type { Country } from "../../core/types";
import type { TripGroupDef } from "../../core/data/tripGroups";
import { getWikiImage } from "../../utils/wikiImages";

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
  createCountry({ name: "Norway", popularityScore: 20, combo: ["Sweden"] }),
  createCountry({ name: "Switzerland", popularityScore: 10, combo: ["France"] }),
  createCountry({ name: "Argentina", popularityScore: 30, combo: ["Antarctica"] }),
  createCountry({ name: "Antarctica", popularityScore: 1, combo: ["Argentina"] }),
  createCountry({ name: "Japan", popularityScore: 80, region: "Asia", budgetBreakdown: { solo: "₹1L", couple: "₹2L", family4: "₹3L" } }),
];

function renderTrips(options?: {
  onSelect?: ReturnType<typeof vi.fn>;
  tripGroups?: TripGroupDef[];
  countries?: Country[];
}) {
  const onSelect = options?.onSelect ?? vi.fn();
  const tripGroups = options?.tripGroups ?? [];
  const countriesToRender = options?.countries ?? countries;
  return {
    onSelect,
    ...render(
      <TripsView
        countries={countriesToRender}
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
        tripGroups={tripGroups}
        onSaveTrip={vi.fn()}
        onDeleteTrip={vi.fn()}
      />,
    ),
  };
}

function appearsBefore(a: Element, b: Element): boolean {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
}

describe("TripsView", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1280 });
    vi.mocked(getWikiImage).mockClear();
  });

  it("filters trips by search and supports quick reset", async () => {
    const user = userEvent.setup();
    renderTrips();

    const searchInput = screen.getByPlaceholderText("Search countries, cities...");
    expect(screen.getByRole("button", { name: "Open Sweden" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Switzerland" })).toBeInTheDocument();

    await user.type(searchInput, "swit");

    expect(screen.getByRole("button", { name: "Open Switzerland" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open Sweden" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear all" }));
    expect(searchInput).toHaveValue("");
    expect(screen.getByRole("button", { name: "Open Sweden" })).toBeInTheDocument();
  });

  it("supports list/grid toggles, sort updates, and card selection", async () => {
    const user = userEvent.setup();
    const { onSelect } = renderTrips();

    await user.click(screen.getByRole("button", { name: "List view" }));
    expect(screen.getByRole("button", { name: "List view" })).toHaveClass("bg-blue-50");

    const sortSelect = screen.getAllByLabelText("Sort trips").pop()!;
    await user.selectOptions(sortSelect, "az");
    await user.hover(sortSelect);
    await waitFor(() => {
      expect(screen.getByRole("tooltip")).toHaveTextContent("Sort: A to Z.");
    });
    await user.unhover(sortSelect);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open Japan" }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: "Japan" }));

    await user.click(screen.getByRole("button", { name: "Grid view" }));
    expect(screen.getByRole("button", { name: "Grid view" })).toHaveClass("bg-blue-50");
  });

  it("applies popularity sorting when search is empty", async () => {
    const user = userEvent.setup();
    renderTrips();

    const sweden = screen.getByRole("button", { name: "Open Sweden" });
    const japan = screen.getByRole("button", { name: "Open Japan" });
    const antarctica = screen.getByRole("button", { name: "Open Antarctica" });

    expect(appearsBefore(sweden, japan)).toBe(true);
    expect(appearsBefore(japan, antarctica)).toBe(true);

    await user.selectOptions(screen.getAllByLabelText("Sort trips").pop()!, "az");
    const argentina = screen.getByRole("button", { name: "Open Argentina" });
    const norway = screen.getByRole("button", { name: "Open Norway" });
    expect(appearsBefore(argentina, norway)).toBe(true);
  });

  it("keeps relevance-driven results while search query is active", async () => {
    const user = userEvent.setup();
    renderTrips();

    const searchInput = screen.getByPlaceholderText("Search countries, cities...");
    await user.type(searchInput, "swit");

    const switzerlandBeforeSortChange = screen.getByRole("button", { name: "Open Switzerland" });
    await user.selectOptions(screen.getAllByLabelText("Sort trips").pop()!, "za");
    const switzerlandAfterSortChange = screen.getByRole("button", { name: "Open Switzerland" });

    expect(switzerlandBeforeSortChange).toBeInTheDocument();
    expect(switzerlandAfterSortChange).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open Japan" })).not.toBeInTheDocument();
  });

  it("opens suggested combine country from grid chips", async () => {
    const user = userEvent.setup();
    const { onSelect } = renderTrips();

    await user.click(screen.getByRole("button", { name: "Grid view" }));
    const swedenCard = screen.getByRole("button", { name: "Open Sweden" }).closest("article");
    expect(swedenCard).not.toBeNull();
    await user.click(within(swedenCard as HTMLElement).getByRole("button", { name: "Norway" }));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: "Norway" }));
  });

  it("opens add-on country from list combo chips", async () => {
    const user = userEvent.setup();
    const { onSelect } = renderTrips({
      tripGroups: [{ main: "Norway", addOns: ["Sweden"], region: "Europe" }],
    });

    const norwayCard = screen.getByRole("button", { name: "Open Norway" }).closest("article");
    expect(norwayCard).not.toBeNull();
    await user.click(within(norwayCard as HTMLElement).getByRole("button", { name: "Sweden" }));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: "Sweden" }));
  });

  it("uses first experience as image-query fallback when landmark is missing", async () => {
    const uae = createCountry({
      name: "United Arab Emirates",
      region: "Middle East",
      landmark: undefined,
      experiences: ["Burj Khalifa", "Desert Safari"],
    });

    renderTrips({ countries: [uae] });

    await waitFor(() => {
      expect(getWikiImage).toHaveBeenCalledWith("Burj Khalifa United Arab Emirates");
    });
  });
});
