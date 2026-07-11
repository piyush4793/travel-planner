import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PlanCountrySwitcher, { type SwitcherUnit } from "../components/views/plan/PlanCountrySwitcher";

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

  it("renders nothing when there are no units", () => {
    const { container } = render(<PlanCountrySwitcher units={[]} activeIndex={0} onSelect={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
