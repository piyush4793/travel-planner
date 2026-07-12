import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PlanCountrySwitcher, { type SwitcherUnit } from "@/components/views/plan/shell/PlanCountrySwitcher";

const units: SwitcherUnit[] = [
  { name: "Japan", places: 3, days: 8 },
  { name: "Thailand", places: 2, days: 5 },
];

describe("PlanCountrySwitcher", () => {
  it("shows the active country with a position badge and place/day meta", () => {
    render(<PlanCountrySwitcher units={units} activeIndex={0} onSelect={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: /Switch country/i });
    expect(trigger).toHaveTextContent("Japan");
    expect(trigger).toHaveTextContent("1/2");
  });

  it("selects another country from the menu", () => {
    const onSelect = vi.fn();
    render(<PlanCountrySwitcher units={units} activeIndex={0} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: /Switch country/i }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: /Thailand/i }));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it("clamps an out-of-range active index to the last unit", () => {
    render(<PlanCountrySwitcher units={units} activeIndex={9} onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Switch country/i })).toHaveTextContent("Thailand");
  });

  it("roves focus across menu items with arrow / Home / End keys", () => {
    render(<PlanCountrySwitcher units={units} activeIndex={0} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Switch country/i }));
    const menu = screen.getByRole("menu", { name: /Switch country/i });
    const items = screen.getAllByRole("menuitemradio");
    items[0].focus(); // deterministic start (independent of rAF auto-focus)
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(items[1]).toHaveFocus();
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(items[0]).toHaveFocus(); // wraps around
    fireEvent.keyDown(menu, { key: "End" });
    expect(items[1]).toHaveFocus();
    fireEvent.keyDown(menu, { key: "Home" });
    expect(items[0]).toHaveFocus();
    fireEvent.keyDown(menu, { key: "ArrowUp" });
    expect(items[1]).toHaveFocus(); // wraps backward
  });

  it("renders nothing when there are no units", () => {
    const { container } = render(<PlanCountrySwitcher units={[]} activeIndex={0} onSelect={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
