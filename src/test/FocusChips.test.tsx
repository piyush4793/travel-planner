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
});
