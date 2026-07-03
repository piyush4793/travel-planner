import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TripsView from "../../components/views/TripsView";
import type { Country } from "../../core/types";
import type { TripGroupDef } from "../../core/data/tripGroups";
import { getWikiImage } from "../../utils/wikiImages";

const mockUseBreakpoint = vi.hoisted(() => vi.fn(() => "desktop"));

vi.mock("../../hooks/useBreakpoint", () => ({
  useBreakpoint: mockUseBreakpoint,
}));

vi.mock("../../utils/wikiImages", () => ({
  getWikiImage: vi.fn(() => new Promise<null>(() => {})),
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
    budgetBreakdown: { solo: "₹1L", couple: "₹2L", family4: "₹4L" },
    experiences: ["Food"],
    ...overrides,
  };
}

const countries: Country[] = [
  createCountry({ name: "Sweden", popularityScore: 95, combo: ["Norway"], experiences: ["Museums", "Food"] }),
  createCountry({ name: "Norway", popularityScore: 20, combo: ["Sweden"], experiences: ["Fjords", "Food"] }),
  createCountry({ name: "Japan", popularityScore: 80, region: "Asia", bestMonths: ["October"], budgetBreakdown: { solo: "₹1L", couple: "₹2L", family4: "₹3.5L" } }),
  createCountry({ name: "Argentina", popularityScore: 30, region: "Americas", combo: ["Antarctica"] }),
  createCountry({ name: "Antarctica", popularityScore: 1, region: "Americas", combo: ["Argentina"] }),
  createCountry({ name: "Oman", popularityScore: 5, region: "Middle East" }),
  createCountry({ name: "Jordan", popularityScore: 70, region: "Middle East", combo: ["Oman"] }),
];

function renderTrips(options?: {
  onSelect?: ReturnType<typeof vi.fn>;
  onSaveTrip?: ReturnType<typeof vi.fn>;
  onDeleteTrip?: ReturnType<typeof vi.fn>;
  setBudgetBasis?: ReturnType<typeof vi.fn>;
  setBudgetFilter?: ReturnType<typeof vi.fn>;
  setMonth?: ReturnType<typeof vi.fn>;
  setVisitedFilter?: ReturnType<typeof vi.fn>;
  tripGroups?: TripGroupDef[];
  countries?: Country[];
  visitedNames?: Set<string>;
  favorites?: Set<string>;
  visitedFilter?: "all" | "visited" | "unvisited";
  selectedMonth?: string[];
  budgetFilter?: "all" | "budget" | "mid" | "premium";
  budgetBasis?: "solo" | "couple" | "family4";
  defaultBasis?: "solo" | "couple" | "family4";
}) {
  const props = {
    countries: options?.countries ?? countries,
    visitedNames: options?.visitedNames ?? new Set<string>(),
    favorites: options?.favorites ?? new Set<string>(),
    visitedFilter: options?.visitedFilter ?? "all",
    setVisitedFilter: options?.setVisitedFilter ?? vi.fn(),
    selectedMonth: options?.selectedMonth ?? [],
    setMonth: options?.setMonth ?? vi.fn(),
    budgetFilter: options?.budgetFilter ?? "all",
    setBudgetFilter: options?.setBudgetFilter ?? vi.fn(),
    budgetBasis: options?.budgetBasis ?? "couple",
    setBudgetBasis: options?.setBudgetBasis ?? vi.fn(),
    defaultBasis: options?.defaultBasis ?? "couple",
    onSelect: options?.onSelect ?? vi.fn(),
    tripGroups: options?.tripGroups ?? [],
    onSaveTrip: options?.onSaveTrip ?? vi.fn(),
    onDeleteTrip: options?.onDeleteTrip ?? vi.fn(),
  };

  const view = render(<TripsView {...props} />);
  return {
    ...view,
    props,
    rerenderTrips: (overrides: Partial<typeof props>) => view.rerender(<TripsView {...props} {...overrides} />),
  };
}

function appearsBefore(a: Element, b: Element): boolean {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
}

function openButton(name: string): HTMLElement {
  return screen.getByRole("button", { name: `Open ${name}` });
}

describe("TripsView more coverage", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1280 });
    mockUseBreakpoint.mockReturnValue("desktop");
    vi.mocked(getWikiImage).mockClear();
  });

  it("switches popular, A-Z, and Z-A sort modes to reorder visible cards", async () => {
    const user = userEvent.setup();
    renderTrips();

    expect(appearsBefore(openButton("Sweden"), openButton("Japan"))).toBe(true);
    expect(appearsBefore(openButton("Japan"), openButton("Oman"))).toBe(true);

    const sortSelect = screen.getAllByLabelText("Sort trips").pop()!;
    await user.selectOptions(sortSelect, "az");
    expect(appearsBefore(openButton("Antarctica"), openButton("Argentina"))).toBe(true);
    expect(appearsBefore(openButton("Argentina"), openButton("Japan"))).toBe(true);

    await user.selectOptions(sortSelect, "za");
    expect(appearsBefore(openButton("Sweden"), openButton("Oman"))).toBe(true);
    expect(appearsBefore(openButton("Oman"), openButton("Norway"))).toBe(true);
  });

  it("collapses secondary trip filters by default and reveals them on demand", async () => {
    const user = userEvent.setup();
    renderTrips();

    // Secondary filters (Trip type / progress / region) are hidden by default
    // so the desktop rail stays scannable for new users.
    expect(screen.queryByLabelText("Trip type")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Region filter")).not.toBeInTheDocument();

    const disclosure = screen.getByRole("button", { name: /Trip filters/ });
    expect(disclosure).toHaveAttribute("aria-expanded", "false");

    await user.click(disclosure);
    expect(disclosure).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Trip type")).toBeInTheDocument();
    expect(screen.getByLabelText("Region filter")).toBeInTheDocument();
  });

  it("filters all, combo, and solo trip views", async () => {
    const user = userEvent.setup();
    renderTrips({ tripGroups: [{ main: "Sweden", addOns: ["Norway"], region: "Europe" }] });

    await user.click(screen.getByRole("button", { name: /Trip filters/ }));
    const tripType = screen.getByLabelText("Trip type");
    expect(openButton("Sweden")).toBeInTheDocument();
    expect(openButton("Japan")).toBeInTheDocument();

    await user.selectOptions(tripType, "combo");
    expect(openButton("Sweden")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open Japan" })).not.toBeInTheDocument();

    await user.selectOptions(tripType, "solo");
    expect(screen.queryByRole("button", { name: "Open Sweden" })).not.toBeInTheDocument();
    expect(openButton("Japan")).toBeInTheDocument();
  });

  it("filters completed, in-progress, and not-started visited modes", async () => {
    const user = userEvent.setup();
    renderTrips({ visitedNames: new Set(["Japan"]) });

    await user.click(screen.getByRole("button", { name: /Trip filters/ }));
    const progress = screen.getByLabelText("Trip progress");
    await user.selectOptions(progress, "completed");
    expect(openButton("Japan")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open Sweden" })).not.toBeInTheDocument();

    await user.selectOptions(progress, "not-started");
    expect(openButton("Sweden")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open Japan" })).not.toBeInTheDocument();

    await user.selectOptions(progress, "in-progress");
    expect(screen.getByText("Your travel board is empty")).toBeInTheDocument();
  });

  it("calls budget basis changes and reflects the active basis in list budget chips", async () => {
    const user = userEvent.setup();
    const setBudgetBasis = vi.fn();
    const { rerenderTrips } = renderTrips({ setBudgetBasis, countries: [countries[0]], budgetBasis: "couple" });

    await user.click(screen.getByRole("button", { name: "List view" }));
    expect(screen.getByText(/👫 ₹2L/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Solo" }));
    expect(setBudgetBasis).toHaveBeenCalledWith("solo");

    rerenderTrips({ budgetBasis: "solo", setBudgetBasis });
    expect(screen.getByText(/👤 ₹1L/)).toBeInTheDocument();
  });

  it("prioritizes primary-country search matches over combo matches and clears back to all trips", async () => {
    const user = userEvent.setup();
    renderTrips();

    const searchInput = screen.getByPlaceholderText("Search countries, cities...");
    await user.type(searchInput, "oman");

    expect(openButton("Oman")).toBeInTheDocument();
    expect(openButton("Jordan")).toBeInTheDocument();
    expect(appearsBefore(openButton("Oman"), openButton("Jordan"))).toBe(true);

    await user.click(screen.getByRole("button", { name: "Clear all" }));
    expect(searchInput).toHaveValue("");
    expect(openButton("Sweden")).toBeInTheDocument();
  });

  it("uses desktop grid by default and switches to list layout", async () => {
    const user = userEvent.setup();
    renderTrips({ countries: [countries[5]] });

    expect(screen.getByRole("button", { name: "Grid view" })).toHaveClass("bg-blue-50");
    expect(screen.getByText("No combo yet")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "List view" }));
    expect(screen.getByRole("button", { name: "List view" })).toHaveClass("bg-blue-50");
    expect(screen.queryByText("No combo yet")).not.toBeInTheDocument();
    expect(screen.getByText(/👫 ₹2L/)).toBeInTheDocument();
  });

  it("uses mobile list by default and can toggle to grid on wider phones", async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 390 });
    mockUseBreakpoint.mockReturnValue("mobile");
    renderTrips({ countries: [countries[5]] });

    expect(screen.getByRole("button", { name: "Switch to grid" })).toBeInTheDocument();
    expect(screen.queryByText("No combo yet")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Switch to grid" }));
    expect(screen.getByRole("button", { name: "Switch to list" })).toBeInTheDocument();
    expect(screen.getByText("No combo yet")).toBeInTheDocument();
  });

  it("renders Favorites, Planning, and Completed sections from favorite and visited state", () => {
    renderTrips({
      countries: [countries[0], countries[1], countries[2]],
      favorites: new Set(["Norway"]),
      visitedNames: new Set(["Japan"]),
    });

    expect(screen.getByText("Favorites")).toBeInTheDocument();
    expect(screen.getByText("Planning")).toBeInTheDocument();
    expect(screen.getAllByText("Completed").length).toBeGreaterThan(0);
  });

  it("saves edits to a custom trip and resets it through the confirm dialog", async () => {
    const user = userEvent.setup();
    const onSaveTrip = vi.fn();
    const onDeleteTrip = vi.fn();
    const finland = createCountry({ name: "Finland", popularityScore: 15 });
    const tripGroups: TripGroupDef[] = [{ main: "Sweden", addOns: ["Norway"], region: "Europe", isCustom: true }];
    renderTrips({ countries: [countries[0], countries[1], finland], tripGroups, onSaveTrip, onDeleteTrip });

    const swedenCard = openButton("Sweden").closest("article");
    expect(swedenCard).not.toBeNull();
    await user.click(within(swedenCard as HTMLElement).getByRole("button", { name: "Edit trip" }));

    await user.click(screen.getByRole("button", { name: "Finland" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSaveTrip).toHaveBeenCalledWith("Sweden", { main: "Sweden", addOns: ["Norway", "Finland"], region: "Europe" });

    await user.click(within(openButton("Sweden").closest("article") as HTMLElement).getByRole("button", { name: "Edit trip" }));
    await user.click(screen.getByText("↩ Reset"));
    const dialog = screen.getByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Reset" }));
    await waitFor(() => expect(onDeleteTrip).toHaveBeenCalledWith("Sweden"));
  });

  it("shows the empty state and lets clear-all reset active controls", async () => {
    const user = userEvent.setup();
    const setMonth = vi.fn();
    const setBudgetBasis = vi.fn();
    const setBudgetFilter = vi.fn();
    const setVisitedFilter = vi.fn();
    renderTrips({
      countries: [],
      selectedMonth: ["April"],
      budgetFilter: "premium",
      budgetBasis: "family4",
      defaultBasis: "couple",
      visitedFilter: "visited",
      setMonth,
      setBudgetBasis,
      setBudgetFilter,
      setVisitedFilter,
    });

    expect(screen.getByText("Your travel board is empty")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear all filters" }));
    expect(setMonth).toHaveBeenCalledWith([]);
    expect(setBudgetBasis).toHaveBeenCalledWith("couple");
    expect(setBudgetFilter).toHaveBeenCalledWith("all");
    expect(setVisitedFilter).toHaveBeenCalledWith("all");
  });

  it("opens and restores the desktop filter rail while region filtering trips", async () => {
    const user = userEvent.setup();
    renderTrips();

    await user.click(screen.getByRole("button", { name: "Hide filters" }));
    expect(screen.getByRole("button", { name: "Show filters" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show filters" }));
    await user.click(screen.getByRole("button", { name: /Trip filters/ }));
    await user.selectOptions(screen.getByLabelText("Region filter"), "Americas");

    expect(openButton("Argentina")).toBeInTheDocument();
    expect(openButton("Antarctica")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open Sweden" })).not.toBeInTheDocument();
  });

  it("drives the mobile filter sheet controls and local trip filters", async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 390 });
    mockUseBreakpoint.mockReturnValue("mobile");
    const setMonth = vi.fn();
    const setBudgetBasis = vi.fn();
    const setBudgetFilter = vi.fn();
    const setVisitedFilter = vi.fn();

    renderTrips({
      tripGroups: [{ main: "Sweden", addOns: ["Norway"], region: "Europe" }],
      setMonth,
      setBudgetBasis,
      setBudgetFilter,
      setVisitedFilter,
    });

    await user.click(screen.getByRole("button", { name: "Toggle filters" }));
    await user.click(screen.getByRole("button", { name: "Apr" }));
    await user.click(screen.getByRole("button", { name: "Family" }));
    await user.click(screen.getByRole("button", { name: "Premium" }));
    await user.click(screen.getByRole("button", { name: "Not visited" }));
    expect(setMonth).toHaveBeenCalledWith(["Apr"]);
    expect(setBudgetBasis).toHaveBeenCalledWith("family4");
    expect(setBudgetFilter).toHaveBeenCalledWith("premium");
    expect(setVisitedFilter).toHaveBeenCalledWith("unvisited");

    await user.click(screen.getByRole("button", { name: "Combo" }));
    expect(openButton("Sweden")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open Japan" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.getByText("Your travel board is empty")).toBeInTheDocument();
  });

  it("cycles mobile sorting and opens the stats quick-action trip", async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 390 });
    mockUseBreakpoint.mockReturnValue("mobile");
    const onSelect = vi.fn();
    renderTrips({ countries: [countries[0], countries[1]], favorites: new Set(["Norway"]), onSelect });

    const mobileSort = screen.getByRole("button", { name: "Sort trips" });
    expect(mobileSort).toHaveTextContent("Popular");
    await user.click(mobileSort);
    expect(mobileSort).toHaveTextContent("A→Z");
    await user.click(mobileSort);
    expect(mobileSort).toHaveTextContent("Z→A");

    await user.click(screen.getByRole("button", { name: "View stats" }));
    expect(screen.getByText("Travel Progress")).toBeInTheDocument();
    expect(screen.getByText(/Best month:/)).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: /Norway/ }).pop()!);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: "Norway" }));
  });

  it("paginates long sections with a show-more control", async () => {
    const user = userEvent.setup();
    const manyCountries = Array.from({ length: 7 }, (_, index) =>
      createCountry({ name: `Trip ${index + 1}`, popularityScore: 7 - index, combo: [] }),
    );
    renderTrips({ countries: manyCountries });

    expect(openButton("Trip 1")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open Trip 7" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Show more/ }));
    expect(openButton("Trip 7")).toBeInTheDocument();
  });

  it("supports editor add-on search, max add-ons, clearing selections, and cancel", async () => {
    const user = userEvent.setup();
    const finland = createCountry({ name: "Finland", popularityScore: 15 });
    const denmark = createCountry({ name: "Denmark", popularityScore: 14 });
    const belgium = createCountry({ name: "Belgium", popularityScore: 13 });
    const tripGroups: TripGroupDef[] = [{ main: "Sweden", addOns: ["Norway"], region: "Europe", isCustom: true }];
    renderTrips({ countries: [countries[0], countries[1], finland, denmark, belgium], tripGroups });

    await user.click(within(openButton("Sweden").closest("article") as HTMLElement).getByRole("button", { name: "Edit trip" }));
    await user.type(screen.getByPlaceholderText("Search countries to add…"), "zzz");
    expect(screen.getByText("No matching countries")).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText("Search countries to add…"));
    await user.click(screen.getByRole("button", { name: "Finland" }));
    expect(screen.getByRole("button", { name: "Denmark" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Clear all" }));
    expect(screen.getByText("0/2 add-ons")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(openButton("Sweden")).toBeInTheDocument();
  });
});
