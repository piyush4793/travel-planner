import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RouteLeversBar, { type LeverStop } from "../../components/views/plan/RouteLeversBar";

function stop(name: string, customDays: number, over: Partial<LeverStop> = {}): LeverStop {
  return { name, customDays, daysPinned: false, maxDays: 10, setDays: vi.fn(), ...over };
}

function renderBar(over: Partial<React.ComponentProps<typeof RouteLeversBar>> = {}) {
  const props: React.ComponentProps<typeof RouteLeversBar> = {
    stops: [stop("Norway", 3), stop("Denmark", 3)],
    anchorName: "Norway",
    onSetAnchor: vi.fn(),
    onReorder: vi.fn(),
    onAutoArrange: vi.fn(),
    canAutoArrange: false,
    ...over,
  };
  return { props, ...render(<RouteLeversBar {...props} />) };
}

describe("RouteLeversBar", () => {
  it("reorders a stop via keyboard on the route-order grip", () => {
    const onReorder = vi.fn();
    renderBar({ onReorder });
    fireEvent.click(screen.getByRole("button", { name: "Edit route order" }));
    fireEvent.keyDown(screen.getByRole("button", { name: /Reorder Denmark/ }), { key: "ArrowUp" });
    expect(onReorder).toHaveBeenCalledWith(1, 0);
  });

  it("ignores keyboard reorder past the route bounds", () => {
    const onReorder = vi.fn();
    renderBar({ onReorder });
    fireEvent.click(screen.getByRole("button", { name: "Edit route order" }));
    fireEvent.keyDown(screen.getByRole("button", { name: /Reorder Norway/ }), { key: "ArrowUp" });
    fireEvent.keyDown(screen.getByRole("button", { name: /Reorder Denmark/ }), { key: "ArrowDown" });
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("promotes a non-anchor stop and badges the anchor", () => {
    const onSetAnchor = vi.fn();
    renderBar({ onSetAnchor });
    fireEvent.click(screen.getByRole("button", { name: "Edit route order" }));
    expect(screen.queryByRole("button", { name: "Make Norway the anchor" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Make Denmark the anchor" }));
    expect(onSetAnchor).toHaveBeenCalledWith("Denmark");
  });

  it("gates auto-arrange behind canAutoArrange", () => {
    const onAutoArrange = vi.fn();
    const { rerender, props } = renderBar({ canAutoArrange: false, onAutoArrange });
    fireEvent.click(screen.getByRole("button", { name: "Edit route order" }));
    expect(screen.queryByRole("button", { name: /Auto-arrange/ })).not.toBeInTheDocument();
    rerender(<RouteLeversBar {...props} canAutoArrange />);
    fireEvent.click(screen.getByRole("button", { name: /Auto-arrange/ }));
    expect(onAutoArrange).toHaveBeenCalled();
  });

  it("adds a night to the shortest unpinned stop", () => {
    const setNorway = vi.fn();
    renderBar({ stops: [stop("Norway", 2, { setDays: setNorway }), stop("Denmark", 4)] });
    fireEvent.click(screen.getByRole("button", { name: "Adjust total trip length" }));
    fireEvent.click(screen.getByRole("button", { name: "Add a night" }));
    expect(setNorway).toHaveBeenCalledWith(3);
  });

  it("removes a night from the longest unpinned stop", () => {
    const setDenmark = vi.fn();
    renderBar({ stops: [stop("Norway", 2), stop("Denmark", 4, { setDays: setDenmark })] });
    fireEvent.click(screen.getByRole("button", { name: "Adjust total trip length" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove a night" }));
    expect(setDenmark).toHaveBeenCalledWith(3);
  });

  it("disables + when every stop is pinned or maxed", () => {
    renderBar({
      stops: [stop("Norway", 10, { maxDays: 10 }), stop("Denmark", 5, { daysPinned: true })],
    });
    fireEvent.click(screen.getByRole("button", { name: "Adjust total trip length" }));
    expect(screen.getByRole("button", { name: "Add a night" })).toBeDisabled();
  });
});
