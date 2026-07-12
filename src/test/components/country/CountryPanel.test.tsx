import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CountryPanel from "@/components/country/CountryPanel.tsx";
import type { Country } from "@/core/types.ts";

vi.mock("@/hooks/useBreakpoint.ts", () => ({
  useBreakpoint: () => "desktop",
}));

vi.mock("@/hooks/usePanelDrag.ts", () => ({
  usePanelDrag: () => ({
    panelWidth: 360,
    startPanelDrag: vi.fn(),
  }),
}));

vi.mock("@/hooks/useCountryRule.ts", () => ({
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
  it("renders expected flag emojis for countries with manual fallbacks", () => {
    const cases = [
      { name: "South Korea", flag: "🇰🇷" },
      { name: "Denmark", flag: "🇩🇰" },
      { name: "Czech Republic", flag: "🇨🇿" },
    ];

    for (const testCase of cases) {
      const { unmount } = render(
        <CountryPanel
          country={makeCountry({ name: testCase.name })}
          onClose={vi.fn()}
          onSelectCountry={vi.fn()}
          isFavorite={false}
          onToggleFavorite={vi.fn()}
          isVisited={false}
          onToggleVisited={vi.fn()}
          onEdit={vi.fn()}
          onUpdateNotes={vi.fn()}
          homeCountry="India"
          budgetBasis="couple"
          allCountries={[makeCountry({ name: testCase.name })]}
        />,
      );

      expect(screen.getByText(testCase.flag)).toBeInTheDocument();
      unmount();
    }
  });

  it("closes the panel when Escape is pressed", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <CountryPanel
        country={makeCountry({ name: "Japan" })}
        onClose={onClose}
        onSelectCountry={vi.fn()}
        isFavorite={false}
        onToggleFavorite={vi.fn()}
        isVisited={false}
        onToggleVisited={vi.fn()}
        onEdit={vi.fn()}
        onUpdateNotes={vi.fn()}
        homeCountry="India"
        budgetBasis="couple"
        allCountries={[makeCountry({ name: "Japan" })]}
      />,
    );

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("labels the header budget strip as a static full-trip reference", () => {
    render(
      <CountryPanel
        country={makeCountry({ name: "Japan" })}
        onClose={vi.fn()}
        onSelectCountry={vi.fn()}
        isFavorite={false}
        onToggleFavorite={vi.fn()}
        isVisited={false}
        onToggleVisited={vi.fn()}
        onEdit={vi.fn()}
        onUpdateNotes={vi.fn()}
        homeCountry="India"
        budgetBasis="couple"
        allCountries={[makeCountry({ name: "Japan" })]}
      />,
    );

    expect(screen.getByText("Typical budget")).toBeInTheDocument();
    const tooltip = screen.getByLabelText(/fixed reference/i);
    expect(tooltip).toBeInTheDocument();
  });

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
        onEdit={vi.fn()}
        onUpdateNotes={vi.fn()}
        homeCountry="India"
        budgetBasis="couple"
        allCountries={[makeCountry({ combo: ["France"] }), france]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Combine with/i }));
    await user.click(screen.getByRole("button", { name: "France" }));

    expect(onSelectCountry).toHaveBeenCalledWith(expect.objectContaining({ name: "France" }));
  });

  it("opens a combo country not in My List via resolveCountry fallback", async () => {
    const user = userEvent.setup();
    const onSelectCountry = vi.fn();
    const resolved = makeCountry({ name: "Sri Lanka", lat: 7.8, lng: 80.7, experiences: [] });
    const resolveCountry = vi.fn().mockReturnValue(resolved);

    render(
      <CountryPanel
        country={makeCountry({ name: "India", combo: ["Sri Lanka"] })}
        onClose={vi.fn()}
        onSelectCountry={onSelectCountry}
        isFavorite={false}
        onToggleFavorite={vi.fn()}
        isVisited={false}
        onToggleVisited={vi.fn()}
        onEdit={vi.fn()}
        onUpdateNotes={vi.fn()}
        homeCountry="India"
        budgetBasis="couple"
        allCountries={[makeCountry({ name: "India", combo: ["Sri Lanka"] })]}
        resolveCountry={resolveCountry}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Combine with/i }));
    await user.click(screen.getByRole("button", { name: "Sri Lanka" }));

    expect(resolveCountry).toHaveBeenCalledWith("Sri Lanka");
    expect(onSelectCountry).toHaveBeenCalledWith(expect.objectContaining({ name: "Sri Lanka" }));
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
        onEdit={vi.fn()}
        onUpdateNotes={onUpdateNotes}
        homeCountry="India"
        budgetBasis="couple"
        allCountries={[makeCountry({ notes: "Initial note" })]}
      />,
    );

    await user.click(screen.getByRole("tab", { name: /Notes/i }));
    const textarea = screen.getByPlaceholderText(/Jot down ideas/i);
    await user.clear(textarea);
    await user.type(textarea, "Pack adapter");
    await user.tab();

    expect(onUpdateNotes).toHaveBeenCalledWith("Pack adapter");
  });

  it("opens and closes the expanded notes editor", async () => {
    const user = userEvent.setup();
    render(
      <CountryPanel
        country={makeCountry({ notes: "Initial note" })}
        onClose={vi.fn()}
        onSelectCountry={vi.fn()}
        isFavorite={false}
        onToggleFavorite={vi.fn()}
        isVisited={false}
        onToggleVisited={vi.fn()}
        onEdit={vi.fn()}
        onUpdateNotes={vi.fn()}
        homeCountry="India"
        budgetBasis="couple"
        allCountries={[makeCountry({ notes: "Initial note" })]}
      />,
    );

    await user.click(screen.getByRole("tab", { name: /Notes/i }));
    await user.click(screen.getByRole("button", { name: /Expand notes/i }));
    expect(screen.getByRole("dialog", { name: /Expanded notes/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Close$/i }));
    expect(screen.queryByRole("dialog", { name: /Expanded notes/i })).not.toBeInTheDocument();
  });
});
