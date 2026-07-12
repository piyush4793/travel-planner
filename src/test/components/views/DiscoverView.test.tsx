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

  it("renders the count and progress stats", () => {
    render(
      <DiscoverView
        catalog={catalog}
        myListNames={new Set(["Japan", "France"])}
        onAddToList={vi.fn()}
        onRemoveFromList={vi.fn()}
        onAddMany={vi.fn()}
        onResetList={vi.fn()}
      />,
    );

    // Desktop toolbar shows "2 / 3 (67%)"
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText(/67%/)).toBeInTheDocument();
  });

  it("filters countries by search text", async () => {
    const user = userEvent.setup();

    render(
      <DiscoverView
        catalog={catalog}
        myListNames={new Set()}
        onAddToList={vi.fn()}
        onRemoveFromList={vi.fn()}
        onAddMany={vi.fn()}
        onResetList={vi.fn()}
      />,
    );

    await user.type(screen.getByPlaceholderText(/search countries/i), "Jap");

    await waitFor(() => {
      expect(screen.getByText("Japan")).toBeInTheDocument();
      expect(screen.queryByText("France")).not.toBeInTheDocument();
      expect(screen.queryByText("Brazil")).not.toBeInTheDocument();
    });
  });

  it("filters countries by region popover", async () => {
    const user = userEvent.setup();

    render(
      <DiscoverView
        catalog={catalog}
        myListNames={new Set()}
        onAddToList={vi.fn()}
        onRemoveFromList={vi.fn()}
        onAddMany={vi.fn()}
        onResetList={vi.fn()}
      />,
    );

    // Open region popover, then click Asia
    await user.click(screen.getByRole("button", { name: /Region/i }));
    await user.click(screen.getByRole("button", { name: "Asia" }));

    expect(screen.getByText("Japan")).toBeInTheDocument();
    expect(screen.queryByText("France")).not.toBeInTheDocument();
    expect(screen.queryByText("Brazil")).not.toBeInTheDocument();
  });

  it("calls onAddToList when clicking an un-listed country card", async () => {
    const user = userEvent.setup();
    const onAddToList = vi.fn();

    render(
      <DiscoverView
        catalog={catalog}
        myListNames={new Set()}
        onAddToList={onAddToList}
        onRemoveFromList={vi.fn()}
        onAddMany={vi.fn()}
        onResetList={vi.fn()}
      />,
    );

    // Each card is a <button> now — find the one containing "Brazil"
    const brazilCard = screen.getByRole("button", { name: /Brazil/i });
    await user.click(brazilCard);

    expect(onAddToList).toHaveBeenCalledWith("Brazil");
  });

  it("calls onRemoveFromList when clicking a listed country card", async () => {
    const user = userEvent.setup();
    const onRemoveFromList = vi.fn();

    render(
      <DiscoverView
        catalog={catalog}
        myListNames={new Set(["Japan"])}
        onAddToList={vi.fn()}
        onRemoveFromList={onRemoveFromList}
        onAddMany={vi.fn()}
        onResetList={vi.fn()}
      />,
    );

    const japanCard = screen.getByRole("button", { name: /Japan/i });
    await user.click(japanCard);

    // Removal now asks for confirmation before firing.
    const confirmBtn = await screen.findByRole("button", { name: "Remove" });
    await user.click(confirmBtn);

    expect(onRemoveFromList).toHaveBeenCalledWith("Japan");
  });

  it("does not remove a listed country when the confirmation is cancelled", async () => {
    const user = userEvent.setup();
    const onRemoveFromList = vi.fn();

    render(
      <DiscoverView
        catalog={catalog}
        myListNames={new Set(["Japan"])}
        onAddToList={vi.fn()}
        onRemoveFromList={onRemoveFromList}
        onAddMany={vi.fn()}
        onResetList={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Japan/i }));
    await user.click(await screen.findByRole("button", { name: "Keep" }));

    expect(onRemoveFromList).not.toHaveBeenCalled();
  });
});
