import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CalendarView from "@/components/views/CalendarView.tsx";
import type { Country } from "@/core/types.ts";

vi.mock("maplibre-gl", () => ({
  default: { Map: vi.fn(), Marker: vi.fn() },
  Map: vi.fn(),
  Marker: vi.fn(),
}));

vi.mock("@/utils/wikiImages.ts", () => ({
  getWikiImage: vi.fn(),
}));

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
    budgetBreakdown: { solo: "₹1.2L", couple: "₹2L", family4: "₹4L" },
    experiences: ["Temples"],
  },
  {
    name: "Iceland",
    lat: 64,
    lng: -21,
    bestMonths: ["June", "July"],
    worstMonths: ["January"],
    budget: "₹3L",
    budgetBreakdown: { solo: "₹1.8L", couple: "₹3L", family4: "₹6L" },
    experiences: ["Northern Lights"],
  },
  {
    name: "Peru",
    lat: -9,
    lng: -75,
    bestMonths: ["May"],
    worstMonths: [],
    budget: "₹1.5L",
    experiences: ["Hiking"],
  },
];

describe("CalendarView additional coverage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-03T12:00:00Z"));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders legend, current month highlight, and budget basis", () => {
    render(
      <CalendarView
        countries={countries}
        onPlanTrip={vi.fn()}
        budgetBasis="family4"
      />,
    );

    expect(screen.getByText("Best")).toBeInTheDocument();
    expect(screen.getByText("Avoid")).toBeInTheDocument();
    expect(screen.getByText("Now")).toBeInTheDocument();

    const desktopHeader = screen.getAllByRole("columnheader", { name: "Jul" })[0];
    expect(desktopHeader).toHaveClass("bg-blue-600", "text-white");

    const japanRow = screen.getAllByText("Japan")[0].closest("tr")!;
    expect(within(japanRow).getByText(/₹4L/)).toBeInTheDocument();
  });

  it("filters rows by selected best month and clears the month filter", async () => {
    const user = userEvent.setup();

    render(
      <CalendarView
        countries={countries}
        onPlanTrip={vi.fn()}
        budgetBasis="couple"
      />,
    );

    await user.click(screen.getByRole("button", { name: /months/i }));
    await user.click(screen.getAllByRole("button", { name: "Jun" })[1]);

    expect(screen.getAllByText("Iceland").length).toBeGreaterThan(0);
    expect(screen.queryByText("Japan")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /months/i })).toHaveTextContent("1");

    await user.click(screen.getAllByRole("button", { name: "Clear" })[1]);

    expect(screen.getAllByText("Japan").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Peru").length).toBeGreaterThan(0);
  });

  it("shows empty state for search results and clears back to all destinations", async () => {
    const user = userEvent.setup();

    render(
      <CalendarView
        countries={countries}
        onPlanTrip={vi.fn()}
        budgetBasis="couple"
      />,
    );

    await user.type(screen.getAllByLabelText("Search destinations")[1], "zzzz");

    expect(screen.getAllByText("No destinations match").length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole("button", { name: "Clear all filters" })[0]);

    expect(screen.getAllByText("Japan").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Iceland").length).toBeGreaterThan(0);
  });

  it("starts a plan for a destination reached with keyboard navigation", async () => {
    const user = userEvent.setup();
    const onPlanTrip = vi.fn();

    render(
      <CalendarView
        countries={countries}
        onPlanTrip={onPlanTrip}
        budgetBasis="couple"
      />,
    );

    const firstRow = screen.getAllByText("Japan")[0].closest("tr")!;
    await user.click(firstRow);
    onPlanTrip.mockClear();

    await user.keyboard("{ArrowDown}");
    await waitFor(() => expect(document.activeElement).toHaveTextContent("Iceland"));
    await user.keyboard("{Enter}");

    expect(onPlanTrip).toHaveBeenCalledWith(["Iceland"]);
  });

  it("closes the month popover with Escape", async () => {
    const user = userEvent.setup();

    render(
      <CalendarView
        countries={countries}
        onPlanTrip={vi.fn()}
        budgetBasis="couple"
      />,
    );

    await user.click(screen.getByRole("button", { name: /months/i }));
    expect(screen.getByText("Select months")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByText("Select months")).not.toBeInTheDocument();
  });
});
