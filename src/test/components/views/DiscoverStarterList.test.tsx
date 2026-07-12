import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DiscoverView from "@/components/views/DiscoverView.tsx";
import type { CatalogEntry } from "@/core/types.ts";
import { creatorWishlistNames } from "@/core/data/creatorWishlist.ts";

vi.mock("maplibre-gl", () => ({
  default: { Map: vi.fn(), Marker: vi.fn() },
  Map: vi.fn(),
  Marker: vi.fn(),
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

const catalog: CatalogEntry[] = [
  { name: "Japan", lat: 35, lng: 139, region: "Asia" },
  { name: "France", lat: 46, lng: 2, region: "Europe" },
  { name: "Brazil", lat: -15, lng: -47, region: "Americas" },
];

function renderView(overrides: Partial<React.ComponentProps<typeof DiscoverView>> = {}) {
  const props = {
    catalog,
    myListNames: new Set<string>(),
    onAddToList: vi.fn(),
    onRemoveFromList: vi.fn(),
    onAddMany: vi.fn(),
    onResetList: vi.fn(),
    ...overrides,
  };
  render(<DiscoverView {...props} />);
  return props;
}

describe("DiscoverView — starter-list journey", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("opens the wishlist dialog and adds only not-yet-listed countries", async () => {
    const user = userEvent.setup();
    const onAddMany = vi.fn();
    // Japan is already in the list → should be excluded from the add set.
    renderView({ myListNames: new Set(["Japan"]), onAddMany });

    await user.click(screen.getByRole("button", { name: /wishlist/i }));

    const dialog = await screen.findByRole("dialog", { name: /Creator's wishlist/i });
    const addBtn = within(dialog).getByRole("button", { name: /Add \d+ to My List/ });
    await user.click(addBtn);

    expect(onAddMany).toHaveBeenCalledTimes(1);
    const added: string[] = onAddMany.mock.calls[0][0];
    expect(added).not.toContain("Japan");
    expect(added.length).toBe(creatorWishlistNames().length - 1);
  });

  it("confirms before resetting the list to defaults", async () => {
    const user = userEvent.setup();
    const onResetList = vi.fn();
    renderView({ myListNames: new Set(["Brazil"]), onResetList });

    await user.click(screen.getByRole("button", { name: /Reset to starter list/ }));

    const confirm = await screen.findByRole("alertdialog");
    await user.click(within(confirm).getByRole("button", { name: /Reset list/ }));

    await waitFor(() => expect(onResetList).toHaveBeenCalledTimes(1));
  });

  it("does not reset when the confirm is cancelled", async () => {
    const user = userEvent.setup();
    const onResetList = vi.fn();
    renderView({ onResetList });

    await user.click(screen.getByRole("button", { name: /Reset to starter list/ }));
    const confirm = await screen.findByRole("alertdialog");
    await user.click(within(confirm).getByRole("button", { name: /Keep my list/ }));

    expect(onResetList).not.toHaveBeenCalled();
  });
});
