import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import PlanCityJumpNav from "../../components/views/plan/PlanCityJumpNav";
import type { CityGroup } from "../../components/country/itinerary/ItineraryView";

const GROUPS: CityGroup[] = [
  { name: "Flåm", days: [{ label: "Day 1", activities: [] }] },
  { name: "Lofoten", days: [{ label: "Day 2", activities: [] }, { label: "Day 3", activities: [] }], transport: { type: "flight", label: "Domestic flight" } },
];

describe("PlanCityJumpNav — jump-to-city", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  function renderWithAnchors(groups = GROUPS) {
    return render(
      <div>
        <PlanCityJumpNav groups={groups} />
        {GROUPS.map((g) => (
          <div key={g.name} id={`city-${g.name}`}>{g.name}</div>
        ))}
      </div>,
    );
  }

  it("renders nothing for a single-city plan", () => {
    const { container } = render(<PlanCityJumpNav groups={[GROUPS[0]]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders desktop pills and jumps on click", () => {
    renderWithAnchors();
    fireEvent.click(screen.getByRole("button", { name: /Jump to Lofoten/i }));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("opens the mobile dropdown and selects a city", () => {
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

  it("closes the mobile dropdown on Escape", () => {
    render(<PlanCityJumpNav groups={GROUPS} />);
    const trigger = screen.getByRole("button", { name: /Jump to city…/i });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
