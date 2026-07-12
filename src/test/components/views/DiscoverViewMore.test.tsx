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

vi.mock("@/utils/wikiImages.ts", () => ({
  getWikiImage: vi.fn(),
}));

const matchMediaMock = vi.fn();
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: matchMediaMock,
});

const setBreakpoint = (breakpoint: "mobile" | "desktop") => {
  matchMediaMock.mockImplementation((query: string) => ({
    matches:
      breakpoint === "desktop" && (query === "(min-width: 1024px)" || query === "(min-width: 768px)"),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

const catalog: CatalogEntry[] = [
  { name: "Japan", lat: 35, lng: 139, region: "Asia" },
  { name: "France", lat: 46, lng: 2, region: "Europe" },
  { name: "Brazil", lat: -15, lng: -47, region: "Americas" },
  { name: "Egypt", lat: 26, lng: 30, region: "Africa" },
  { name: "Oman", lat: 21, lng: 57, region: "Middle East" },
];

describe("DiscoverView additional coverage", () => {
  beforeEach(() => {
    localStorage.clear();
    setBreakpoint("desktop");
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows an empty result state for unmatched search and resets it", async () => {
    const user = userEvent.setup();
    render(<DiscoverView catalog={catalog} onPlanTrip={vi.fn()} />);

    await user.type(screen.getByLabelText("Search countries"), "Atlantis");

    await waitFor(() => {
      expect(screen.getByText("No countries match")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Clear all filters" }));

    expect(screen.getByText("Japan")).toBeInTheDocument();
    expect(screen.getByText("Showing 5")).toBeInTheDocument();
  });

  it("uses the mobile filter panel for region filtering", async () => {
    setBreakpoint("mobile");
    const user = userEvent.setup();
    render(<DiscoverView catalog={catalog} onPlanTrip={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Filters" }));
    await user.click(screen.getByRole("button", { name: "Middle East" }));

    expect(screen.getByText("Oman")).toBeInTheDocument();
    expect(screen.queryByText("Japan")).not.toBeInTheDocument();
    expect(screen.getByText(/1 of 5 destinations/)).toBeInTheDocument();
  });

  it("closes desktop popovers with Escape", async () => {
    const user = userEvent.setup();
    render(<DiscoverView catalog={catalog} onPlanTrip={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /region/i }));
    expect(screen.getByRole("button", { name: "🌍 All Regions" })).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("button", { name: "🌍 All Regions" })).not.toBeInTheDocument();
  });

  it("caps the trip tray at the multi-country maximum", async () => {
    const user = userEvent.setup();
    render(<DiscoverView catalog={catalog} onPlanTrip={vi.fn()} />);

    for (const name of ["Japan", "France", "Brazil", "Egypt"]) {
      await user.click(screen.getByRole("button", { name: `Add ${name} to trip` }));
    }

    // 5th toggle is disabled once the tray is full.
    expect(screen.getByRole("button", { name: "Add Oman to trip" })).toBeDisabled();
    expect(screen.getByText(/4 of 4/)).toBeInTheDocument();
  });
});
