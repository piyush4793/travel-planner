import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FocusChips from "../components/views/plan/FocusChips";

describe("FocusChips", () => {
  it("renders each option and marks the selected ones pressed", () => {
    render(<FocusChips options={["Fjords", "Food"]} selected={["Fjords"]} onToggle={vi.fn()} onClear={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Fjords" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Food" })).toHaveAttribute("aria-pressed", "false");
  });

  it("fires onToggle with the tapped tag", () => {
    const onToggle = vi.fn();
    render(<FocusChips options={["Fjords", "Food"]} selected={[]} onToggle={onToggle} onClear={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Food" }));
    expect(onToggle).toHaveBeenCalledWith("Food");
  });

  it("shows a clear control only when something is selected", () => {
    const onClear = vi.fn();
    const { rerender } = render(
      <FocusChips options={["Fjords"]} selected={[]} onToggle={vi.fn()} onClear={onClear} />,
    );
    expect(screen.queryByRole("button", { name: /Clear/ })).not.toBeInTheDocument();
    rerender(<FocusChips options={["Fjords"]} selected={["Fjords"]} onToggle={vi.fn()} onClear={onClear} />);
    fireEvent.click(screen.getByRole("button", { name: "Clear (1)" }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("counts only selected tags the destination can deliver (selected ∩ options)", () => {
    // A stop inherits the trip vibe seed (5 tags) but only 3 exist here, so 3
    // chips light up — the Clear count must read 3, not 5.
    render(
      <FocusChips
        options={["Fjords", "Northern Lights", "Hiking", "Skiing", "Cruises"]}
        selected={["Fjords", "Northern Lights", "Hiking", "Beaches", "Safari"]}
        onToggle={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Clear (3)" })).toBeInTheDocument();
  });

  it("hides Clear when no selected tag applies to this destination", () => {
    render(
      <FocusChips options={["Fjords"]} selected={["Beaches", "Safari"]} onToggle={vi.fn()} onClear={vi.fn()} />,
    );
    expect(screen.queryByRole("button", { name: /Clear/ })).not.toBeInTheDocument();
  });

  it("renders Clear as a top action, ahead of the chips (not orphaned below)", () => {
    render(<FocusChips options={["Fjords", "Food"]} selected={["Fjords"]} onToggle={vi.fn()} onClear={vi.fn()} />);
    const clear = screen.getByRole("button", { name: "Clear (1)" });
    const firstChip = screen.getByRole("button", { name: "Fjords" });
    // DOCUMENT_POSITION_FOLLOWING (4) means the chip comes after Clear in the DOM.
    expect(clear.compareDocumentPosition(firstChip) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
