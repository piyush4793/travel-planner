import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import PlanCityJumpNav, { type JumpSection } from "@/components/views/plan/controls/PlanCityJumpNav";

const CITIES = [
  { name: "Flåm", days: [{ label: "Day 1", activities: [] }] },
  { name: "Lofoten", days: [{ label: "Day 2", activities: [] }, { label: "Day 3", activities: [] }], transport: { type: "flight" as const, label: "Domestic flight" } },
];

const NORWAY: JumpSection = { country: "Norway", cities: CITIES };

describe("PlanCityJumpNav — jump-to-city", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  function renderWithAnchors(sections: JumpSection[] = [NORWAY], onJump?: (c: string) => void) {
    return render(
      <div>
        <PlanCityJumpNav sections={sections} onJump={onJump} />
        {sections.flatMap((s) => s.cities).map((g) => (
          <div key={g.name} id={`city-${g.name}`}>{g.name}</div>
        ))}
      </div>,
    );
  }

  it("renders nothing for a single-city plan", () => {
    const { container } = render(<PlanCityJumpNav sections={[{ country: "Norway", cities: [CITIES[0]] }]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders desktop pills and jumps on click", () => {
    renderWithAnchors();
    fireEvent.click(screen.getByRole("button", { name: /Jump to Lofoten/i }));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("opens the dropdown and selects a city", () => {
    renderWithAnchors();
    const trigger = screen.getByRole("button", { name: /Jump to city…/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const listbox = screen.getByRole("listbox", { name: /Jump to city/i });
    const option = within(listbox).getByRole("option", { name: /Lofoten/i });
    fireEvent.click(option);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    // Selecting closes the dropdown and updates the trigger label.
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveTextContent("Lofoten");
  });

  it("collapses to the dropdown once a single route has many cities (>5)", () => {
    const cities = Array.from({ length: 6 }, (_, i) => ({
      name: `City${i}`,
      days: [{ label: `Day ${i + 1}`, activities: [] }],
    }));
    const { container } = render(<PlanCityJumpNav sections={[{ country: "Norway", cities }]} />);
    // Pills block is not rendered once dense; the trigger drops its md:hidden guard.
    expect(container.querySelector('[class*="flex-wrap"]')).toBeNull();
    const trigger = screen.getByRole("button", { name: /Jump to city…/i });
    expect(trigger.parentElement?.className).not.toContain("md:hidden");
  });

  it("keeps the desktop pills for short single-country routes (≤5 cities)", () => {
    const { container } = render(<PlanCityJumpNav sections={[NORWAY]} />);
    const pills = container.querySelector('[class*="flex-wrap"]') as HTMLElement;
    expect(pills.className).toContain("md:flex");
    const trigger = screen.getByRole("button", { name: /Jump to city…/i });
    expect(trigger.parentElement?.className).toContain("md:hidden");
  });

  it("groups by country for a multi-country route and labels the trigger", () => {
    const sweden: JumpSection = { country: "Sweden", cities: [{ name: "Stockholm", days: [{ label: "Day 4", activities: [] }] }] };
    renderWithAnchors([NORWAY, sweden]);
    // Multi-country always uses the grouped dropdown, never pills.
    const trigger = screen.getByRole("button", { name: /Jump to country \/ city…/i });
    fireEvent.click(trigger);
    const listbox = screen.getByRole("listbox", { name: /Jump to city/i });
    // Country group headers scope each stop's cities.
    expect(within(listbox).getByRole("group", { name: "Norway" })).toBeInTheDocument();
    expect(within(listbox).getByRole("group", { name: "Sweden" })).toBeInTheDocument();
  });

  it("roves focus across options with arrow / Home / End keys", () => {
    renderWithAnchors();
    fireEvent.click(screen.getByRole("button", { name: /Jump to city…/i }));
    const listbox = screen.getByRole("listbox", { name: /Jump to city/i });
    const options = within(listbox).getAllByRole("option");
    options[0].focus(); // deterministic start (independent of rAF auto-focus)
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(options[1]).toHaveFocus();
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(options[0]).toHaveFocus(); // wraps around
    fireEvent.keyDown(listbox, { key: "End" });
    expect(options[options.length - 1]).toHaveFocus();
    fireEvent.keyDown(listbox, { key: "Home" });
    expect(options[0]).toHaveFocus();
  });

  it("caps the desktop dropdown height so it stays compact as cities scale", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      name: `City${i}`,
      days: [{ label: `Day ${i + 1}`, activities: [] }],
    }));
    render(<PlanCityJumpNav sections={[{ country: "Norway", cities: many }]} />);
    fireEvent.click(screen.getByRole("button", { name: /Jump to city…/i }));
    const popover = document.querySelector("div.fixed.z-50") as HTMLElement;
    expect(popover).toBeTruthy();
    const maxH = parseInt(popover.style.maxHeight, 10);
    expect(maxH).toBeLessThanOrEqual(340);
    expect(popover.className).toContain("overflow-y-auto");
  });
});
