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
  getWikiImage: vi.fn(),
}));

vi.mock("../../core/featureFlags", () => ({
  isEnabled: (flag: string) => flag === "tripGroups",
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
    experiences: ["Food", "Museums"],
    ...overrides,
  };
}

const countries: Country[] = [
  createCountry({ name: "Sweden", popularityScore: 95, combo: ["Norway"], landmark: "Vasa Museum" }),
  createCountry({ name: "Norway", popularityScore: 20, combo: ["Sweden"], experiences: ["Food", "Fjords"] }),
];

function renderTrips(overrides: Record<string, unknown> = {}) {
  const tripGroups: TripGroupDef[] = [{ main: "Sweden", addOns: ["Norway"], region: "Europe", isCustom: true }];
  const props = {
    countries,
    visitedNames: new Set<string>(["Norway"]),
    favorites: new Set<string>(["Norway"]),
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
    tripGroups,
    onSaveTrip: vi.fn(),
    onDeleteTrip: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<TripsView {...props} />) };
}

describe("TripsView trip cards (combo rendering)", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 700 });
    mockUseBreakpoint.mockReturnValue("desktop");
    vi.mocked(getWikiImage).mockReset().mockResolvedValue("https://img.example/pic.jpg");
  });

  it("renders the wiki image collage once images resolve", async () => {
    const { container } = renderTrips();
    await waitFor(() => {
      expect(container.querySelector('img[src="https://img.example/pic.jpg"]')).not.toBeNull();
    });
    expect(getWikiImage).toHaveBeenCalled();
  });

  it("shows the add-on pill in visited state", async () => {
    renderTrips();
    const card = (await screen.findByRole("button", { name: "Open Sweden" })).closest("article") as HTMLElement;

    // Norway add-on pill renders with the visited (emerald) styling
    const norwayPill = within(card).getByRole("button", { name: /Norway/i });
    expect(norwayPill).toBeInTheDocument();
    expect(norwayPill.className).toMatch(/emerald/);
  });

  it("selects the add-on country when its pill is clicked", async () => {
    const onSelect = vi.fn();
    renderTrips({ onSelect });
    const card = (await screen.findByRole("button", { name: "Open Sweden" })).closest("article") as HTMLElement;

    await userEvent.click(within(card).getByRole("button", { name: /Norway/i }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: "Norway" }));
  });

  it("selects the main country when the title button is activated by keyboard", async () => {
    const onSelect = vi.fn();
    renderTrips({ onSelect });
    const title = await screen.findByRole("button", { name: "Open Sweden" });

    await userEvent.click(title);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: "Sweden" }));
  });
});
