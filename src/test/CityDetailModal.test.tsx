import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import CityDetailModal from "../components/views/plan/CityDetailModal";
import type { CityDecision } from "../core/utils/decideCities";

function decision(over: Partial<CityDecision> = {}): CityDecision {
  return {
    name: "Lofoten",
    included: true,
    recDays: 3,
    focusMatches: ["Northern Lights"],
    otherExperiences: ["Islands", "Hiking"],
    bestWindow: "Jun–Aug",
    avoidWindow: "Nov",
    brief: "Arctic archipelago — dramatic peaks and fishing villages.",
    importance: 0.8,
    signal: "Top for Northern Lights",
    ...over,
  };
}

describe("CityDetailModal", () => {
  it("renders the full brief, stats, signal and every experience tag", () => {
    render(<CityDetailModal decision={decision()} onToggle={vi.fn()} onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog", { name: /Lofoten details/i });
    expect(within(dialog).getByRole("heading", { name: "Lofoten" })).toBeInTheDocument();
    expect(within(dialog).getByText("Top for Northern Lights")).toBeInTheDocument();
    expect(within(dialog).getByText(/Arctic archipelago/)).toBeInTheDocument();
    expect(within(dialog).getByText("3 nights")).toBeInTheDocument();
    expect(within(dialog).getByText("Jun–Aug")).toBeInTheDocument();
    expect(within(dialog).getByText("Nov")).toBeInTheDocument();
    // Focus match + both other experiences are all present (uncapped).
    for (const tag of ["Northern Lights", "Islands", "Hiking"]) {
      expect(within(dialog).getByText(tag)).toBeInTheDocument();
    }
  });

  it("labels the action from the included state and toggles on click", () => {
    const onToggle = vi.fn();
    const { rerender } = render(<CityDetailModal decision={decision({ included: true })} onToggle={onToggle} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /In your plan — tap to remove/i }));
    expect(onToggle).toHaveBeenCalledOnce();

    rerender(<CityDetailModal decision={decision({ included: false })} onToggle={onToggle} onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Add to plan/i })).toBeInTheDocument();
  });

  it("closes from the close button", () => {
    const onClose = vi.fn();
    render(<CityDetailModal decision={decision()} onToggle={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /Close details/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("omits absent stats and the experiences section when there is nothing to show", () => {
    render(
      <CityDetailModal
        decision={decision({ recDays: 0, bestWindow: null, avoidWindow: null, brief: null, signal: null, focusMatches: [], otherExperiences: [] })}
        onToggle={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByText(/Recommended stay/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/Experiences/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Top for Northern Lights")).not.toBeInTheDocument();
  });
});
