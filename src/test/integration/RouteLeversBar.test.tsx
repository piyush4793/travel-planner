import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RouteLeversBar, { type LeverStop } from "../../components/views/plan/RouteLeversBar";

function stop(name: string): LeverStop {
  return { name };
}

function renderBar(over: Partial<React.ComponentProps<typeof RouteLeversBar>> = {}) {
  const props: React.ComponentProps<typeof RouteLeversBar> = {
    stops: [stop("Norway"), stop("Denmark")],
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
});
