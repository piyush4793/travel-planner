import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DiscoverView from "../../components/views/DiscoverView";
import type { CatalogEntry } from "../../core/types";

vi.mock("maplibre-gl", () => ({
  default: { Map: vi.fn(), Marker: vi.fn() },
  Map: vi.fn(),
  Marker: vi.fn(),
}));

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

  it("renders the worldwide and in-list counts", () => {
    render(
      <DiscoverView
        catalog={catalog}
        myListNames={new Set(["Japan", "France"])}
        onAddToList={vi.fn()}
        onRemoveFromList={vi.fn()}
      />,
    );

    expect(screen.getByText("countries worldwide").parentElement).toHaveTextContent("3countries worldwide");
    expect(screen.getByText("in your list").parentElement).toHaveTextContent("2in your list");
  });

  it("filters countries by search text", async () => {
    const user = userEvent.setup();

    render(
      <DiscoverView
        catalog={catalog}
        myListNames={new Set()}
        onAddToList={vi.fn()}
        onRemoveFromList={vi.fn()}
      />,
    );

    await user.type(screen.getByPlaceholderText(/search countries/i), "Jap");

    await waitFor(() => {
      expect(screen.getByText("Japan")).toBeInTheDocument();
      expect(screen.queryByText("France")).not.toBeInTheDocument();
      expect(screen.queryByText("Brazil")).not.toBeInTheDocument();
    });
  });

  it("filters countries by region pills", async () => {
    const user = userEvent.setup();

    render(
      <DiscoverView
        catalog={catalog}
        myListNames={new Set()}
        onAddToList={vi.fn()}
        onRemoveFromList={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Asia" }));

    expect(screen.getByText("Japan")).toBeInTheDocument();
    expect(screen.queryByText("France")).not.toBeInTheDocument();
    expect(screen.queryByText("Brazil")).not.toBeInTheDocument();
  });

  it("calls onAddToList for countries not already in the list", async () => {
    const user = userEvent.setup();
    const onAddToList = vi.fn();

    render(
      <DiscoverView
        catalog={catalog}
        myListNames={new Set()}
        onAddToList={onAddToList}
        onRemoveFromList={vi.fn()}
      />,
    );

    const brazilCard = screen.getByText("Brazil").closest("div.rounded-xl");
    expect(brazilCard).not.toBeNull();

    await user.click(within(brazilCard as HTMLDivElement).getByRole("button", { name: /add to my list/i }));

    expect(onAddToList).toHaveBeenCalledWith("Brazil");
  });

  it("calls onRemoveFromList for countries already in the list", async () => {
    const user = userEvent.setup();
    const onRemoveFromList = vi.fn();

    render(
      <DiscoverView
        catalog={catalog}
        myListNames={new Set(["Japan"])}
        onAddToList={vi.fn()}
        onRemoveFromList={onRemoveFromList}
      />,
    );

    await user.click(screen.getByRole("button", { name: /remove from list/i }));

    expect(onRemoveFromList).toHaveBeenCalledWith("Japan");
  });
});
