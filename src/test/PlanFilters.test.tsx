import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const bpMock = vi.hoisted(() => ({ value: "desktop" as "desktop" | "tablet" | "mobile" }));
vi.mock("../hooks/useBreakpoint", () => ({
  useBreakpoint: () => bpMock.value,
}));

import PlanFilters from "../components/views/plan/PlanFilters";

const baseProps = {
  country: "Norway",
  options: ["Fjords", "Food", "History"],
  selected: [] as string[],
  onToggle: vi.fn(),
  onClear: vi.fn(),
};

describe("PlanFilters", () => {
  beforeEach(() => {
    bpMock.value = "desktop";
    vi.clearAllMocks();
  });

  it("renders nothing when the stop offers no experience tags", () => {
    const { container } = render(<PlanFilters {...baseProps} options={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a count badge and reflects the active experience count", () => {
    render(<PlanFilters {...baseProps} selected={["Fjords", "Food"]} />);
    const trigger = screen.getByRole("button", { name: /Filters for Norway/i });
    expect(trigger).toHaveTextContent("2");
  });

  it("opens an anchored popover on desktop and toggles an experience", () => {
    render(<PlanFilters {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Filters for Norway/i }));
    fireEvent.click(screen.getByRole("button", { name: "History" }));
    expect(baseProps.onToggle).toHaveBeenCalledWith("History");
  });

  it("opens a bottom-sheet dialog on mobile and toggles an experience", () => {
    bpMock.value = "mobile";
    render(<PlanFilters {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Filters for Norway/i }));
    const dialog = screen.getByRole("dialog", { name: /Filters for Norway/i });
    fireEvent.click(screen.getByRole("button", { name: "Fjords" }));
    expect(baseProps.onToggle).toHaveBeenCalledWith("Fjords");
    // Dismiss via the scrim.
    fireEvent.click(screen.getByRole("button", { name: /Dismiss filters/i }));
    expect(dialog).not.toBeInTheDocument();
  });
});
