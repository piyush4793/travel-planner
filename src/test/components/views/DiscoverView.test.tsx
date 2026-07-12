import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DiscoverView from "@/components/views/DiscoverView.tsx";
import type { CatalogEntry } from "@/core/types.ts";

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

const catalog: CatalogEntry[] = [
  { name: "Japan", lat: 35, lng: 139, region: "Asia" },
  { name: "France", lat: 46, lng: 2, region: "Europe" },
  { name: "Brazil", lat: -15, lng: -47, region: "Americas" },
];

describe("DiscoverView", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the visible-country count", () => {
    render(<DiscoverView catalog={catalog} onPlanTrip={vi.fn()} />);
    expect(screen.getAllByText(/Showing 3/).length).toBeGreaterThan(0);
  });

  it("filters countries by search text", async () => {
    const user = userEvent.setup();
    render(<DiscoverView catalog={catalog} onPlanTrip={vi.fn()} />);

    await user.type(screen.getByPlaceholderText(/search countries/i), "Jap");

    await waitFor(() => {
      expect(screen.getByText("Japan")).toBeInTheDocument();
      expect(screen.queryByText("France")).not.toBeInTheDocument();
      expect(screen.queryByText("Brazil")).not.toBeInTheDocument();
    });
  });

  it("filters countries by region popover", async () => {
    const user = userEvent.setup();
    render(<DiscoverView catalog={catalog} onPlanTrip={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /Region/i }));
    await user.click(screen.getByRole("button", { name: "Asia" }));

    expect(screen.getByText("Japan")).toBeInTheDocument();
    expect(screen.queryByText("France")).not.toBeInTheDocument();
    expect(screen.queryByText("Brazil")).not.toBeInTheDocument();
  });

  it("starts a single-country plan from a card's Plan button", async () => {
    const user = userEvent.setup();
    const onPlanTrip = vi.fn();
    render(<DiscoverView catalog={catalog} onPlanTrip={onPlanTrip} />);

    await user.click(screen.getByRole("button", { name: "Plan a trip to Brazil" }));

    expect(onPlanTrip).toHaveBeenCalledWith(["Brazil"]);
  });

  it("builds a multi-destination trip selection and starts a plan from the tray", async () => {
    const user = userEvent.setup();
    const onPlanTrip = vi.fn();
    render(<DiscoverView catalog={catalog} onPlanTrip={onPlanTrip} />);

    await user.click(screen.getByRole("button", { name: "Add Japan to trip" }));
    await user.click(screen.getByRole("button", { name: "Add France to trip" }));

    expect(screen.getByText("Japan → France")).toBeInTheDocument();
    expect(screen.getByText(/2 of 4/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Plan trip/ }));

    expect(onPlanTrip).toHaveBeenCalledWith(["Japan", "France"]);
    // Tray clears after starting the plan.
    expect(screen.queryByText("Japan → France")).not.toBeInTheDocument();
  });

  it("clears the trip selection tray without starting a plan", async () => {
    const user = userEvent.setup();
    const onPlanTrip = vi.fn();
    render(<DiscoverView catalog={catalog} onPlanTrip={onPlanTrip} />);

    await user.click(screen.getByRole("button", { name: "Add Japan to trip" }));
    expect(screen.getByRole("button", { name: "Remove Japan from trip" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(onPlanTrip).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /Plan trip/ })).not.toBeInTheDocument();
  });

  it("clears active filters via the Clear control and shows an empty state", async () => {
    const user = userEvent.setup();
    render(<DiscoverView catalog={catalog} onPlanTrip={vi.fn()} />);

    await user.type(screen.getByPlaceholderText(/search countries/i), "Zzz");
    await waitFor(() => expect(screen.getByText(/No countries match/)).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Clear all filters" }));
    expect(screen.getByText("Japan")).toBeInTheDocument();
  });
});
