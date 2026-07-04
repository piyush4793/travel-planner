import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TripsView from "../../components/views/TripsView";
import type { Country } from "../../core/types";

const mockUseBreakpoint = vi.hoisted(() => vi.fn(() => "desktop"));

vi.mock("../../hooks/useBreakpoint", () => ({
  useBreakpoint: mockUseBreakpoint,
}));

vi.mock("../../utils/wikiImages", () => ({
  getWikiImage: vi.fn(() => new Promise<null>(() => {})),
}));

vi.mock("../../core/featureFlags", () => ({
  isEnabled: (flag: string) => flag === "tripGroups",
}));

function createCountry(overrides: Partial<Country>): Country {
  return {
    name: "Country",
    lat: 0,
    lng: 0,
    region: "Asia",
    popularityScore: 0,
    bestMonths: ["April"],
    budget: "₹1L–₹2L",
    budgetBreakdown: { solo: "₹1L", couple: "₹2L", family4: "₹4L" },
    experiences: ["Food"],
    ...overrides,
  };
}

const countries: Country[] = [
  createCountry({ name: "Japan", popularityScore: 80, region: "Asia" }),
  createCountry({ name: "Thailand", popularityScore: 60, region: "Asia" }),
];

function renderTrips(overrides: Record<string, unknown> = {}) {
  const props = {
    countries,
    visitedNames: new Set<string>(),
    favorites: new Set<string>(),
    visitedFilter: "all" as const,
    setVisitedFilter: vi.fn(),
    selectedMonth: [] as string[],
    setMonth: vi.fn(),
    budgetFilter: "all" as const,
    setBudgetFilter: vi.fn(),
    budgetBasis: "couple" as const,
    setBudgetBasis: vi.fn(),
    defaultBasis: "couple" as const,
    onSelect: vi.fn(),
    tripGroups: [],
    onSaveTrip: vi.fn(),
    onDeleteTrip: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<TripsView {...props} />) };
}

describe("TripsView trip creation", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1280 });
    mockUseBreakpoint.mockReturnValue("desktop");
  });

  it("creates a new trip from the desktop toolbar", async () => {
    const user = userEvent.setup();
    const onSaveTrip = vi.fn();
    renderTrips({ onSaveTrip });

    await user.click(screen.getByRole("button", { name: "+ New Trip" }));

    const selects = screen.getAllByRole("combobox");
    const mainSelect = selects.find((s) => within(s).queryByRole("option", { name: "Japan" }))!;
    await user.selectOptions(mainSelect, "Japan");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSaveTrip).toHaveBeenCalledWith(null, { main: "Japan", addOns: [], region: "Asia" });
  });

  it("cancels new trip creation without saving", async () => {
    const user = userEvent.setup();
    const onSaveTrip = vi.fn();
    renderTrips({ onSaveTrip });

    await user.click(screen.getByRole("button", { name: "+ New Trip" }));
    expect(screen.getByText("Main Country")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText("Main Country")).not.toBeInTheDocument();
    expect(onSaveTrip).not.toHaveBeenCalled();
  });

  it("creates a new trip from the mobile FAB drawer", async () => {
    mockUseBreakpoint.mockReturnValue("mobile");
    const user = userEvent.setup();
    const onSaveTrip = vi.fn();
    renderTrips({ onSaveTrip });

    await user.click(screen.getByRole("button", { name: "New Trip" }));

    const drawer = await screen.findByRole("dialog", { name: /Create new trip/i });
    await user.selectOptions(within(drawer).getAllByRole("combobox")[0], "Thailand");
    await user.click(within(drawer).getByRole("button", { name: "Save" }));

    expect(onSaveTrip).toHaveBeenCalledWith(null, { main: "Thailand", addOns: [], region: "Asia" });
  });

  it("closes the mobile drawer from the close button", async () => {
    mockUseBreakpoint.mockReturnValue("mobile");
    const user = userEvent.setup();
    renderTrips();

    await user.click(screen.getByRole("button", { name: "New Trip" }));
    const drawer = await screen.findByRole("dialog", { name: /Create new trip/i });
    await user.click(within(drawer).getByRole("button", { name: /Close editor/i }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: /Create new trip/i })).not.toBeInTheDocument());
  });
});
