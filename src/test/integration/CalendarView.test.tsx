import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CalendarView from "../../components/views/CalendarView";
import { MONTHS } from "../../core/utils/months";
import type { Country } from "../../core/types";

vi.mock("maplibre-gl", () => ({
  default: { Map: vi.fn(), Marker: vi.fn() },
  Map: vi.fn(),
  Marker: vi.fn(),
}));

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
        onSelect={vi.fn()}
        visitedNames={new Set()}
        selectedCountry={null}
      />,
    );

    expect(screen.getByText("Japan")).toBeInTheDocument();
    expect(screen.getByText("Iceland")).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader")).toHaveLength(13);
    MONTHS.forEach((month) => expect(screen.getByRole("columnheader", { name: month })).toBeInTheDocument());
  });

  it("calls onSelect when a country row is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <CalendarView
        countries={countries}
        onSelect={onSelect}
        visitedNames={new Set()}
        selectedCountry={null}
      />,
    );

    await user.click(screen.getByText("Japan").closest("tr")!);

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: "Japan" }));
  });

  it("styles best months in green and worst months in red", () => {
    render(
      <CalendarView
        countries={countries}
        onSelect={vi.fn()}
        visitedNames={new Set()}
        selectedCountry={null}
      />,
    );

    const japanRow = screen.getByText("Japan").closest("tr");
    expect(japanRow).not.toBeNull();

    const bestCells = within(japanRow as HTMLTableRowElement).getAllByText("✦");
    const worstCell = within(japanRow as HTMLTableRowElement).getByText("·");

    expect(bestCells).toHaveLength(2);
    bestCells.forEach((cell) => expect(cell).toHaveClass("bg-emerald-100", "text-emerald-600"));
    expect(worstCell).toHaveClass("bg-red-50", "text-red-300");
  });
});
