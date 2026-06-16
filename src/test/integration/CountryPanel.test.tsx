import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CountryPanel from "../../components/country/CountryPanel";
import type { Country } from "../../core/types";

vi.mock("../../hooks/useBreakpoint", () => ({
  useBreakpoint: () => "desktop",
}));

vi.mock("../../hooks/usePanelDrag", () => ({
  usePanelDrag: () => ({
    panelWidth: 360,
    startPanelDrag: vi.fn(),
  }),
}));

vi.mock("../../hooks/useCountryRule", () => ({
  useCountryRule: () => ({
    data: null,
    rule: null,
    loading: false,
  }),
}));

function makeCountry(overrides: Partial<Country>): Country {
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

describe("CountryPanel", () => {
  it("navigates to a combo country when combine pill is clicked", async () => {
    const user = userEvent.setup();
    const france = makeCountry({ name: "France", lat: 48.8566, lng: 2.3522, experiences: ["Museums"] });
    const onSelectCountry = vi.fn();

    render(
      <CountryPanel
        country={makeCountry({ combo: ["France"] })}
        onClose={vi.fn()}
        onSelectCountry={onSelectCountry}
        isFavorite={false}
        onToggleFavorite={vi.fn()}
        isVisited={false}
        onToggleVisited={vi.fn()}
        onFilterExperience={vi.fn()}
        activeExperiences={[]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onUpdateNotes={vi.fn()}
        homeCountry="India"
        allCountries={[makeCountry({ combo: ["France"] }), france]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Combine with/i }));
    await user.click(screen.getByRole("button", { name: "France" }));

    expect(onSelectCountry).toHaveBeenCalledWith(expect.objectContaining({ name: "France" }));
  });

  it("persists notes updates on blur", async () => {
    const user = userEvent.setup();
    const onUpdateNotes = vi.fn();

    render(
      <CountryPanel
        country={makeCountry({ notes: "Initial note" })}
        onClose={vi.fn()}
        onSelectCountry={vi.fn()}
        isFavorite={false}
        onToggleFavorite={vi.fn()}
        isVisited={false}
        onToggleVisited={vi.fn()}
        onFilterExperience={vi.fn()}
        activeExperiences={[]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onUpdateNotes={onUpdateNotes}
        homeCountry="India"
        allCountries={[makeCountry({ notes: "Initial note" })]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /My notes/i }));
    const textarea = screen.getByPlaceholderText(/Jot down ideas/i);
    await user.clear(textarea);
    await user.type(textarea, "Pack adapter");
    await user.tab();

    expect(onUpdateNotes).toHaveBeenCalledWith("Pack adapter");
  });
});
