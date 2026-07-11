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

  it("shows the branded header band and a Done button that closes the popover", () => {
    render(<PlanFilters {...baseProps} selected={["Fjords"]} />);
    fireEvent.click(screen.getByRole("button", { name: /Filters for Norway/i }));
    expect(screen.getByRole("heading", { name: /Filters · Norway/i })).toBeInTheDocument();
    const done = screen.getByRole("button", { name: /Done · 1 selected/i });
    fireEvent.click(done);
    expect(screen.queryByRole("heading", { name: /Filters · Norway/i })).not.toBeInTheDocument();
  });

  it("puts an inline Clear on the group header (no inline picker clear) and fires onClear", () => {
    render(<PlanFilters {...baseProps} selected={["Fjords", "Food"]} />);
    fireEvent.click(screen.getByRole("button", { name: /Filters for Norway/i }));
    // No duplicate picker-level clear, no footer "Clear all".
    expect(screen.queryByRole("button", { name: /Clear \(\d+\)/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Clear all/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Clear Experiences/i }));
    expect(baseProps.onClear).toHaveBeenCalledTimes(1);
  });

  it("hides the group Clear when nothing is selected", () => {
    render(<PlanFilters {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Filters for Norway/i }));
    expect(screen.queryByRole("button", { name: /Clear Experiences/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Done$/i })).toBeInTheDocument();
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
