import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import GeneralSettings from "@/components/ai/settings/GeneralSettings.tsx";

vi.mock("@/core/featureFlags.ts", () => ({ isEnabled: () => false }));

const baseProps = {
  homeCountry: "Canada",
  onHomeCountryChange: vi.fn(),
  budgetBasis: "couple" as const,
  onBudgetBasisChange: vi.fn(),
};

describe("GeneralSettings", () => {
  it("shows the home country and default budget party size", () => {
    render(<GeneralSettings {...baseProps} />);
    expect(screen.getByLabelText(/home country: canada/i)).toBeInTheDocument();
    const group = screen.getByRole("radiogroup", { name: /default budget party size/i });
    expect(group).toBeInTheDocument();
  });

  it("reflects the active budget basis as the checked radio", () => {
    render(<GeneralSettings {...baseProps} />);
    expect(screen.getByRole("radio", { name: /couple/i })).toBeChecked();
  });

  it("invokes onBudgetBasisChange when a different party size is chosen", () => {
    const onBudgetBasisChange = vi.fn();
    render(<GeneralSettings {...baseProps} onBudgetBasisChange={onBudgetBasisChange} />);
    fireEvent.click(screen.getByRole("radio", { name: /solo/i }));
    expect(onBudgetBasisChange).toHaveBeenCalledWith("solo");
  });
});
