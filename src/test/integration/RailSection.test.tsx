import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RailSection from "../../components/views/plan/RailSection";

describe("RailSection — luxury collapsible", () => {
  it("renders closed by default and toggles open via the header button", () => {
    render(
      <RailSection title="Focus" hint="what you're into" count={3}>
        <p>panel body</p>
      </RailSection>,
    );
    const toggle = screen.getByRole("button", { name: /Focus/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("honours defaultOpen and wires aria-controls to the body", () => {
    render(
      <RailSection title="Budget" defaultOpen>
        <p>budget body</p>
      </RailSection>,
    );
    const toggle = screen.getByRole("button", { name: /Budget/i });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const bodyId = toggle.getAttribute("aria-controls");
    expect(bodyId).toBeTruthy();
    // Content is always in the DOM (CSS-grid collapse), reachable for a11y/tests.
    expect(screen.getByText("budget body")).toBeInTheDocument();
  });

  it("shows the count badge and hint when provided", () => {
    render(
      <RailSection title="Cities" hint="auto-picked" count={5}>
        <p>cities</p>
      </RailSection>,
    );
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText(/auto-picked/)).toBeInTheDocument();
  });

  it("drops the card chrome in the flat variant (for in-sheet use)", () => {
    const { container: card } = render(
      <RailSection title="Notes" variant="card">
        <p>card body</p>
      </RailSection>,
    );
    expect(card.querySelector("section")?.className).toContain("border-line");

    const { container: flat } = render(
      <RailSection title="Notes" variant="flat">
        <p>flat body</p>
      </RailSection>,
    );
    const section = flat.querySelector("section");
    expect(section?.className).not.toContain("border-line");
    expect(section?.className).not.toContain("rounded-2xl");
    // Still collapsible + content reachable.
    expect(screen.getByText("flat body")).toBeInTheDocument();
  });
});
