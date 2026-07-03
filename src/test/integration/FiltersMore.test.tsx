import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Filters from "../../components/shared/Filters";

function renderFilters(overrides: Partial<React.ComponentProps<typeof Filters>> = {}) {
  const props: React.ComponentProps<typeof Filters> = {
    selectedMonth: [],
    setMonth: vi.fn(),
    visitedFilter: "all",
    setVisitedFilter: vi.fn(),
    budgetFilter: "all",
    setBudgetFilter: vi.fn(),
    ...overrides,
  };
  render(<Filters {...props} />);
  return props;
}

describe("Filters additional behavior", () => {
  it("selects and clears month filters from the month chip", async () => {
    const user = userEvent.setup();
    const setMonth = vi.fn();
    renderFilters({ selectedMonth: ["Jan"], setMonth });

    expect(screen.getByRole("button", { name: /Jan/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Jan/i }));

    await user.click(screen.getByRole("button", { name: "Feb" }));
    expect(setMonth).toHaveBeenCalledWith(["Jan", "Feb"]);

    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(setMonth).toHaveBeenCalledWith([]);
  });

  it("shows a count label for multiple months and toggles an active month off", async () => {
    const user = userEvent.setup();
    const setMonth = vi.fn();
    renderFilters({ selectedMonth: ["Jan", "Mar"], setMonth });

    await user.click(screen.getByRole("button", { name: /Month \(2\)/i }));
    await user.click(screen.getByRole("button", { name: "Jan" }));

    expect(setMonth).toHaveBeenCalledWith(["Mar"]);
  });

  it("applies and clears the selected budget option, closing the dropdown", async () => {
    const user = userEvent.setup();
    const setBudgetFilter = vi.fn();
    renderFilters({ budgetFilter: "mid", setBudgetFilter });

    const budgetTrigger = screen.getByRole("button", { name: /₹₹ Mid/i });
    await user.click(budgetTrigger);

    const budgetPanel = screen.getByText("Budget").closest("div")!;
    await user.click(within(budgetPanel).getByRole("button", { name: /₹₹ Mid/i }));

    expect(setBudgetFilter).toHaveBeenCalledWith("all");
    expect(budgetTrigger).toHaveAttribute("aria-expanded", "false");
  });

  it("updates the visited filter select", async () => {
    const user = userEvent.setup();
    const setVisitedFilter = vi.fn();
    renderFilters({ visitedFilter: "unvisited", setVisitedFilter });

    await user.selectOptions(screen.getByLabelText("Visited filter"), "visited");

    expect(setVisitedFilter).toHaveBeenCalledWith("visited");
  });
});
