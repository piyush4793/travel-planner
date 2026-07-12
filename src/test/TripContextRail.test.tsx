import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import TripContextRail, { type TripCostRow } from "../components/views/plan/TripContextRail";
import type { Country } from "../core/types";
import type { TripPlan } from "../core/utils/tripPlans";

const composed: TripPlan = {
  duration: "6 days",
  costPerPerson: "₹2L – ₹4L",
  days: Array.from({ length: 6 }, (_, i) => ({ label: `Day ${i + 1} — City`, activities: ["x"] })),
  note: "",
  costBasis: "couple",
};

const countries: Country[] = [
  { name: "Norway", lat: 0, lng: 0, budget: "", experiences: [], bestMonths: ["June"], stopoverNote: "Fly via Oslo" },
  { name: "Denmark", lat: 0, lng: 0, budget: "", experiences: [], bestMonths: [], worstMonths: ["January"], avoid: ["Peak summer crowds"] },
];

const perCountryCost: TripCostRow[] = [
  { name: "Norway", nights: 4, cost: "₹1L – ₹2L" },
  { name: "Denmark", nights: 2, cost: "₹1L – ₹2L" },
];

function renderRail(props: Partial<React.ComponentProps<typeof TripContextRail>> = {}) {
  return render(
    <TripContextRail
      countries={countries}
      composedPlan={composed}
      perCountryCost={perCountryCost}
      homeCountry="India"
      notes=""
      {...props}
    />,
  );
}

describe("TripContextRail", () => {
  it("labels the budget ledger with the party basis and a composed subtotal", () => {
    renderRail();
    expect(screen.getByText(/per couple/i)).toBeInTheDocument();
    expect(screen.getByText("₹2L – ₹4L")).toBeInTheDocument();
  });

  it("does not duplicate the who's-going basis switch (it lives in the Trip Header)", () => {
    renderRail();
    expect(screen.queryByRole("group", { name: "Who's going" })).not.toBeInTheDocument();
  });

  it("lists an honest budget ledger with ×nights line items and a flights-extra subtotal", () => {
    renderRail();
    expect(screen.getAllByText("Norway").length).toBeGreaterThan(0);
    expect(screen.getByText("×4n")).toBeInTheDocument();
    expect(screen.getByText("×2n")).toBeInTheDocument();
    expect(screen.getByText(/Inter-country legs/)).toBeInTheDocument();
    expect(screen.getByText(/Subtotal · flights extra/)).toBeInTheDocument();
  });

  it("shows honest trip readiness (visa caveat + derived border crossings)", () => {
    renderRail();
    expect(screen.getByText(/Check visa rules per country/)).toBeInTheDocument();
    expect(screen.getByText(/1 border crossing —/)).toBeInTheDocument();
  });

  it("renders per-country watch-outs and stopover tips", () => {
    renderRail();
    expect(screen.getByText("Fly via Oslo")).toBeInTheDocument();
    expect(screen.getByText("Peak summer crowds")).toBeInTheDocument();
  });

  it("renders a notes scratchpad only when a save handler is supplied", () => {
    const { rerender } = renderRail();
    expect(screen.queryByRole("heading", { name: "Notes" })).not.toBeInTheDocument();
    rerender(
      <TripContextRail
        countries={countries}
        composedPlan={composed}
        perCountryCost={perCountryCost}
        homeCountry="India"
        notes="remember passports"
        onSaveNotes={vi.fn()}
      />,
    );
    expect(screen.getByText("Notes")).toBeInTheDocument();
  });
});
