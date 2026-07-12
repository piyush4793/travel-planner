import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CalendarView from "@/components/views/CalendarView.tsx";
import { MONTHS } from "@/core/utils/months.ts";
import type { Country } from "@/core/types.ts";

vi.mock("maplibre-gl", () => ({
  default: { Map: vi.fn(), Marker: vi.fn() },
  Map: vi.fn(),
  Marker: vi.fn(),
}));

// Mock matchMedia for useBreakpoint — default to desktop
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: query === "(min-width: 1024px)" || query === "(min-width: 768px)",
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const countries: Country[] = [
  {
    name: "Japan",
    lat: 35,
    lng: 139,
    bestMonths: ["March", "April"],
    worstMonths: ["August"],
    budget: "₹2L",
    experiences: ["Temples"],
  },
  {
    name: "Iceland",
    lat: 64,
    lng: -21,
    bestMonths: ["June", "July"],
    budget: "₹3L",
    experiences: ["Northern Lights"],
  },
];

describe("CalendarView", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders destination names and 12 month columns", () => {
    render(
      <CalendarView
        countries={countries}
        onPlanTrip={vi.fn()}
        budgetBasis="couple"
      />,
    );

    expect(screen.getAllByText("Japan").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Iceland").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("columnheader").length).toBeGreaterThanOrEqual(13);
    MONTHS.forEach((month) => expect(screen.getAllByRole("columnheader", { name: month }).length).toBeGreaterThan(0));
  });

  it("starts a plan when a country row is clicked", async () => {
    const user = userEvent.setup();
    const onPlanTrip = vi.fn();

    render(
      <CalendarView
        countries={countries}
        onPlanTrip={onPlanTrip}
        budgetBasis="couple"
      />,
    );

    await user.click(screen.getAllByText("Japan")[0].closest("tr")!);

    expect(onPlanTrip).toHaveBeenCalledWith(["Japan"]);
  });

  it("styles best months in green and worst months in red", () => {
    render(
      <CalendarView
        countries={countries}
        onPlanTrip={vi.fn()}
        budgetBasis="couple"
      />,
    );

    const japanRow = screen.getAllByText("Japan")[0].closest("tr");
    expect(japanRow).not.toBeNull();

    const bestCells = within(japanRow as HTMLTableRowElement).getAllByText("●");
    const worstCell = within(japanRow as HTMLTableRowElement).getByText("✕");

    expect(bestCells).toHaveLength(2);
    bestCells.forEach((cell) => {
      const td = cell.closest("td");
      expect(td).toHaveClass("bg-emerald-100/80", "text-emerald-500");
    });
    const worstTd = worstCell.closest("td");
    expect(worstTd).toHaveClass("bg-red-50/80", "text-red-300");
  });
});
