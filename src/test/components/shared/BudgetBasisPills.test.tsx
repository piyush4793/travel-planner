import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BudgetBasisPills from "@/components/shared/BudgetBasisPills.tsx";
import { BUDGET_BASIS_ORDER, BUDGET_BASIS_META } from "@/core/utils/budget.ts";

function labelFor(idx: number) {
  return BUDGET_BASIS_META[BUDGET_BASIS_ORDER[idx]].label;
}

describe("BudgetBasisPills", () => {
  it("renders a radiogroup with the active basis checked and selects on click", () => {
    const onChange = vi.fn();
    render(<BudgetBasisPills value={BUDGET_BASIS_ORDER[0]} onChange={onChange} />);

    const group = screen.getByRole("radiogroup", { name: /budget party size/i });
    expect(group).toBeInTheDocument();
    const radios = screen.getAllByRole("radio");
    expect(radios[0]).toHaveAttribute("aria-checked", "true");

    fireEvent.click(radios[1]);
    expect(onChange).toHaveBeenCalledWith(BUDGET_BASIS_ORDER[1]);
  });

  it("moves selection with Arrow keys (wrapping both directions) and ignores other keys", () => {
    const onChange = vi.fn();
    render(<BudgetBasisPills value={BUDGET_BASIS_ORDER[0]} onChange={onChange} />);
    const radios = screen.getAllByRole("radio");

    fireEvent.keyDown(radios[0], { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith(BUDGET_BASIS_ORDER[1]);

    fireEvent.keyDown(radios[0], { key: "ArrowDown" });
    expect(onChange).toHaveBeenLastCalledWith(BUDGET_BASIS_ORDER[1]);

    // Wrap backwards past the first item to the last.
    fireEvent.keyDown(radios[0], { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith(BUDGET_BASIS_ORDER[BUDGET_BASIS_ORDER.length - 1]);

    fireEvent.keyDown(radios[0], { key: "ArrowUp" });
    expect(onChange).toHaveBeenLastCalledWith(BUDGET_BASIS_ORDER[BUDGET_BASIS_ORDER.length - 1]);

    onChange.mockClear();
    fireEvent.keyDown(radios[0], { key: "Enter" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows text labels in the header variant when requested", () => {
    render(
      <BudgetBasisPills
        value={BUDGET_BASIS_ORDER[1]}
        onChange={vi.fn()}
        variant="header"
        showLabel
        ariaLabel="Who's going"
      />,
    );
    expect(screen.getByRole("radiogroup", { name: /who's going/i })).toBeInTheDocument();
    // Label text renders alongside the icon (appears in both title and body).
    expect(screen.getAllByText(labelFor(1)).length).toBeGreaterThan(0);
  });
});
