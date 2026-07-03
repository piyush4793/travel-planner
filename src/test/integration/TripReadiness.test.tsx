import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TripReadiness from "../../components/country/panel/TripReadiness";
import type { Country } from "../../core/types";

function makeCountry(overrides: Partial<Country> = {}): Country {
  return {
    name: "Japan",
    lat: 36,
    lng: 138,
    region: "Asia",
    bestMonths: [],
    worstMonths: [],
    cities: [],
    ...overrides,
  } as Country;
}

describe("TripReadiness — progressbar semantics", () => {
  it("exposes an accessible progressbar with the computed completion value", () => {
    render(
      <TripReadiness
        country={makeCountry()}
        isVisited={false}
        isFavorite={false}
        aiPlanCount={0}
        hasNotes={false}
      />,
    );

    // Only "Added to list" is done → 1 of 7 checks → 14%.
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "14");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect(screen.getByText("14%")).toBeInTheDocument();
  });

  it("reports 100% when every readiness check (including visited) is complete", () => {
    render(
      <TripReadiness
        country={makeCountry({
          bestMonths: ["June"],
          cities: [{ name: "Tokyo" }] as Country["cities"],
          budget: "₹1L",
        })}
        isVisited
        isFavorite
        aiPlanCount={2}
        hasNotes
      />,
    );

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    expect(screen.getByText("100%")).toBeInTheDocument();
  });
});
