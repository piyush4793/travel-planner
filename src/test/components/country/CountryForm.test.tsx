import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { setupUser } from "@/test/testUtils.ts";
import CountryForm from "@/components/country/CountryForm.tsx";
import type { Country } from "@/core/types.ts";

function makeCountry(overrides: Partial<Country> = {}): Country {
  return {
    name: "Japan",
    lat: 35.6762,
    lng: 139.6503,
    bestMonths: ["March", "April"],
    budget: "₹2L",
    experiences: ["Food", "Culture"],
    ...overrides,
  };
}

describe("CountryForm", () => {
  it("saves a valid per-person budget as a derived breakdown synced to couple", async () => {
    const user = setupUser();
    const onSave = vi.fn();
    render(<CountryForm initial={makeCountry()} onSave={onSave} onClose={vi.fn()} />);

    const input = screen.getByLabelText(/Budget.*solo|per.?person/i);
    await user.clear(input);
    await user.type(input, "₹1L–₹2L");
    await user.click(screen.getByRole("button", { name: /Save changes/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0][0] as Country;
    expect(saved.budgetBreakdown?.solo).toBe("₹1L–₹2L");
    expect(saved.budgetBreakdown?.couple).toBeTruthy();
    // The flat budget string is kept synced to the derived couple value.
    expect(saved.budget).toBe(saved.budgetBreakdown?.couple);
  });

  it("announces the derived couple/family budget hint via an aria-live region", async () => {
    const user = setupUser();
    render(<CountryForm initial={makeCountry()} onSave={vi.fn()} onClose={vi.fn()} />);

    const input = screen.getByLabelText(/Budget.*solo|per.?person/i);
    await user.clear(input);
    await user.type(input, "₹1L–₹2L");

    const hint = document.getElementById("cf-budget-derived");
    expect(hint).not.toBeNull();
    expect(hint).toHaveAttribute("aria-live", "polite");
  });

  it("shows a format warning for an invalid budget and marks the input invalid", async () => {
    const user = setupUser();
    render(<CountryForm initial={makeCountry()} onSave={vi.fn()} onClose={vi.fn()} />);

    const input = screen.getByLabelText(/Budget.*solo|per.?person/i);
    await user.type(input, "cheap");

    expect(screen.getByText(/Expected format/i)).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("clearing budget saves undefined breakdown and preserves the original budget", async () => {
    const user = setupUser();
    const onSave = vi.fn();
    render(
      <CountryForm
        initial={makeCountry({ budget: "₹3L", budgetBreakdown: { solo: "₹1L", couple: "₹2L", family4: "₹4L" } })}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );

    await user.clear(screen.getByLabelText(/Budget.*solo|per.?person/i));
    await user.click(screen.getByRole("button", { name: /Save changes/i }));

    const saved = onSave.mock.calls[0][0] as Country;
    expect(saved.budgetBreakdown).toBeUndefined();
    expect(saved.budget).toBe("₹3L");
  });

  it("travel style is single-select and toggles off when re-clicked", async () => {
    const user = setupUser();
    const onSave = vi.fn();
    render(<CountryForm initial={makeCountry()} onSave={onSave} onClose={vi.fn()} />);

    const radios = screen.getAllByRole("radio");
    await user.click(radios[0]);
    expect(radios[0]).toHaveAttribute("aria-checked", "true");

    // Selecting another clears the first (single-select).
    await user.click(radios[1]);
    expect(radios[0]).toHaveAttribute("aria-checked", "false");
    expect(radios[1]).toHaveAttribute("aria-checked", "true");

    // Re-clicking the active one toggles it off.
    await user.click(radios[1]);
    expect(radios[1]).toHaveAttribute("aria-checked", "false");

    await user.click(screen.getByRole("button", { name: /Save changes/i }));
    const saved = onSave.mock.calls[0][0] as Country;
    expect(saved.travelStyle).toBeUndefined();
  });

  it("trims landmark and notes on save", async () => {
    const user = setupUser();
    const onSave = vi.fn();
    render(<CountryForm initial={makeCountry()} onSave={onSave} onClose={vi.fn()} />);

    // fireEvent.change sets the exact raw value (with surrounding spaces) deterministically.
    fireEvent.change(screen.getByLabelText(/Landmark image/i), { target: { value: "  Mount Fuji  " } });
    fireEvent.change(screen.getByLabelText(/Notes/i), { target: { value: "  Pack adapter  " } });
    await user.click(screen.getByRole("button", { name: /Save changes/i }));

    const saved = onSave.mock.calls[0][0] as Country;
    expect(saved.landmark).toBe("Mount Fuji");
    expect(saved.notes).toBe("Pack adapter");
  });

  it("closes immediately when there are no unsaved changes", async () => {
    const user = setupUser();
    const onClose = vi.fn();
    render(<CountryForm initial={makeCountry()} onSave={vi.fn()} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: /^Cancel$/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("prompts to discard when dirty and keeps editing on cancel", async () => {
    const user = setupUser();
    const onClose = vi.fn();
    render(<CountryForm initial={makeCountry()} onSave={vi.fn()} onClose={onClose} />);

    await user.type(screen.getByLabelText(/Notes/i), "unsaved");
    await user.click(screen.getByRole("button", { name: /^Cancel$/i }));

    await waitFor(() => expect(screen.getByText(/Discard changes\?/i)).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /Keep editing/i }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("prompts to discard when dirty and closes on discard", async () => {
    const user = setupUser();
    const onClose = vi.fn();
    render(<CountryForm initial={makeCountry()} onSave={vi.fn()} onClose={onClose} />);

    await user.type(screen.getByLabelText(/Notes/i), "unsaved");
    await user.click(screen.getByRole("button", { name: /^Cancel$/i }));

    await waitFor(() => expect(screen.getByText(/Discard changes\?/i)).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /Discard/i }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
