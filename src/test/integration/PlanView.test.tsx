import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import PlanView from "../../components/views/plan/PlanView";
import { setFeatureFlag } from "../../core/featureFlags";
import type { Country } from "../../core/types";

const COUNTRY: Country = {
  name: "Testland (no rule)",
  lat: 0,
  lng: 0,
  bestMonths: ["June"],
  budget: "₹1L",
  experiences: ["Beaches", "Mountains"],
  travelStyle: ["explorer"],
  cities: [
    { name: "Alpha", lat: 1, lng: 1, experiences: ["Beaches"] },
    { name: "Beta", lat: 2, lng: 2, experiences: ["Mountains"] },
  ],
};

function renderView(props: Partial<React.ComponentProps<typeof PlanView>> = {}) {
  const setBudgetBasis = vi.fn();
  const onGoDiscover = vi.fn();
  const onAddToList = vi.fn();
  const utils = render(
    <PlanView
      countries={[COUNTRY]}
      visitedNames={new Set()}
      budgetBasis="couple"
      setBudgetBasis={setBudgetBasis}
      homeCountry="India"
      onGoDiscover={onGoDiscover}
      onAddToList={onAddToList}
      {...props}
    />,
  );
  return { setBudgetBasis, onGoDiscover, onAddToList, ...utils };
}

/** Advance the wizard to the review step by clicking the primary button. */
function goToReview() {
  for (let i = 0; i < 5; i++) {
    const btn = screen.queryByRole("button", { name: /Continue|See my plan/i });
    if (!btn) break;
    fireEvent.click(btn);
  }
}

describe("PlanView — guided planner", () => {
  beforeEach(() => {
    localStorage.clear();
    // These tests exercise the single-country wizard flow; multi-select
    // selection is covered in DestinationPicker.test.
    setFeatureFlag("multiCountryPlanning", false);
  });

  it("shows the 'Where next?' picker with both tiers", () => {
    renderView();
    expect(screen.getByText(/Where do you plan to go next/i)).toBeInTheDocument();
    expect(screen.getByText(/From your list/i)).toBeInTheDocument();
    expect(screen.getByText(/Popular to explore/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Testland \(no rule\)/i })).toBeInTheDocument();
  });

  it("still offers Discover when the list is empty (explore tier only)", () => {
    const { onGoDiscover } = renderView({ countries: [] });
    expect(screen.queryByText(/From your list/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Popular to explore/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /browse Discover/i }));
    expect(onGoDiscover).toHaveBeenCalled();
  });

  it("shows a no-match state with a Discover fallback", () => {
    const { onGoDiscover } = renderView();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzzzz" } });
    expect(screen.getByText(/No destination matches/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Browse Discover/i }));
    expect(onGoDiscover).toHaveBeenCalled();
  });

  it("offers to add an explore (non-list) destination to the list", async () => {
    const { onAddToList } = renderView();
    const exploreSection = screen.getByText(/Popular to explore/i).closest("section")!;
    const firstExplore = within(exploreSection).getAllByRole("button")[0];
    const name = firstExplore.textContent?.replace(/[^\x00-\x7F]/g, "").trim() ?? "";
    fireEvent.click(firstExplore);
    await screen.findByText(/Who's going\?/i);
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const addBtn = await screen.findByRole("button", { name: new RegExp(`Add ${escaped} to your list`, "i") });
    fireEvent.click(addBtn);
    expect(onAddToList).toHaveBeenCalledWith(name);
  });

  it("does not offer add-to-list for a destination already in the list", async () => {
    renderView();
    fireEvent.click(screen.getByRole("button", { name: /Testland \(no rule\)/i }));
    await screen.findByText(/Who's going\?/i);
    expect(screen.queryByRole("button", { name: /to your list/i })).not.toBeInTheDocument();
  });

  it("starts the wizard on the first question after picking a country", async () => {
    renderView();
    fireEvent.click(screen.getByRole("button", { name: "Testland (no rule)" }));
    expect(await screen.findByText(/Who's going\?/i)).toBeInTheDocument();
    // Later steps are not on screen yet.
    expect(screen.queryByText(/Which places\?/i)).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Step 1:/i, selected: true })).toBeInTheDocument();
  });

  it("combines party size and vibe on the first 'basics' step", async () => {
    renderView();
    fireEvent.click(screen.getByRole("button", { name: "Testland (no rule)" }));
    // Both questions share one screen.
    expect(await screen.findByText(/Who's going\?/i)).toBeInTheDocument();
    expect(screen.getByText(/What are you into\?/i)).toBeInTheDocument();
    // Live feedback keeps the step substantial.
    expect(screen.getByText(/Your trip so far/i)).toBeInTheDocument();
  });

  it("walks the funnel and reveals the itinerary on the review step", async () => {
    renderView();
    fireEvent.click(screen.getByRole("button", { name: "Testland (no rule)" }));
    await screen.findByText(/Who's going\?/i);
    goToReview();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Share your trip plan/i })).toBeInTheDocument(),
    );
  });

  it("returns to the destination picker via 'Plan another trip' on the review step", async () => {
    renderView();
    fireEvent.click(screen.getByRole("button", { name: "Testland (no rule)" }));
    await screen.findByText(/Who's going\?/i);
    goToReview();
    await screen.findByRole("button", { name: /Share your trip plan/i });
    // Footer is hidden below lg (jsdom has no media query), so include hidden.
    fireEvent.click(screen.getByRole("button", { name: /Plan another trip/i, hidden: true }));
    await screen.findByText(/Where do you plan to go next/i);
  });

  it("shares the plan from the review step", async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    const original = navigator.share;
    Object.defineProperty(navigator, "share", { value: shareMock, configurable: true, writable: true });
    try {
      renderView();
      fireEvent.click(screen.getByRole("button", { name: "Testland (no rule)" }));
      await screen.findByText(/Who's going\?/i);
      goToReview();
      const shareBtn = await screen.findByRole("button", { name: /Share your trip plan/i });
      fireEvent.click(shareBtn);
      await waitFor(() => expect(shareMock).toHaveBeenCalled());
    } finally {
      if (original) Object.defineProperty(navigator, "share", { value: original, configurable: true, writable: true });
      else delete (navigator as { share?: unknown }).share;
    }
  });

  it("lets the user change the destination from the first step", async () => {
    renderView();
    fireEvent.click(screen.getByRole("button", { name: "Testland (no rule)" }));
    await screen.findByText(/Who's going\?/i);
    fireEvent.click(screen.getByRole("button", { name: /Change/i }));
    expect(screen.getByText(/Where do you plan to go next/i)).toBeInTheDocument();
  });

  it("navigates forward then back through steps", async () => {
    renderView();
    fireEvent.click(screen.getByRole("button", { name: "Testland (no rule)" }));
    await screen.findByText(/Who's going\?/i);
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));
    expect(await screen.findByText(/Which places\?/i)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Step 2:/i, selected: true })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Back/i }));
    expect(await screen.findByText(/Who's going\?/i)).toBeInTheDocument();
  });

  it("resumes the saved destination and step after a page refresh", async () => {
    const { unmount } = renderView();
    // Enter the wizard and advance to Review so a draft is written.
    fireEvent.click(screen.getByRole("button", { name: "Testland (no rule)" }));
    await screen.findByText(/Who's going\?/i);
    goToReview();
    await screen.findByRole("tab", { name: /Step 3:/i, selected: true });

    // Simulate a refresh: fresh mount reading the persisted draft.
    unmount();
    renderView();
    // Back on the wizard (not the picker) at the same destination + step.
    expect(await screen.findByRole("tab", { name: /Step 3:/i, selected: true })).toBeInTheDocument();
    expect(screen.queryByText(/Where do you plan to go next/i)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Testland (no rule)" })).toBeInTheDocument();
  });

  it("clears the saved draft when the user backs out to change destination", async () => {
    const { unmount } = renderView();
    fireEvent.click(screen.getByRole("button", { name: "Testland (no rule)" }));
    await screen.findByText(/Who's going\?/i);
    fireEvent.click(screen.getByRole("button", { name: /Change/i }));
    // Draft cleared → a fresh mount lands on the picker, not the wizard.
    unmount();
    renderView();
    expect(screen.getByText(/Where do you plan to go next/i)).toBeInTheDocument();
  });

  it("shows a Places step with a city card per destination city", async () => {
    renderView();
    fireEvent.click(screen.getByRole("button", { name: "Testland (no rule)" }));
    await screen.findByText(/Who's going\?/i);
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));
    expect(await screen.findByText(/Which places\?/i)).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("selects a vibe on the basics step then clears it", async () => {
    renderView();
    fireEvent.click(screen.getByRole("button", { name: "Testland (no rule)" }));
    await screen.findByText(/What are you into\?/i);

    fireEvent.click(screen.getByRole("button", { name: "Beaches" }));
    const clear = await screen.findByRole("button", { name: /Clear \(1\)/i });
    fireEvent.click(clear);
    await waitFor(() => expect(screen.queryByRole("button", { name: /Clear \(1\)/i })).not.toBeInTheDocument());
  });

  it("hand-picks a city then resets back to the auto selection", async () => {
    renderView();
    fireEvent.click(screen.getByRole("button", { name: "Testland (no rule)" }));
    await screen.findByText(/Who's going\?/i);
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));
    await screen.findByText(/Which places\?/i);

    // Pristine: auto-picked, no reset control yet.
    expect(screen.getByText(/tap to fine-tune/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Reset to auto/i })).not.toBeInTheDocument();

    // Hand-pick a city → switches to the manual "hand-picked" branch + reset appears.
    fireEvent.click(screen.getByRole("button", { name: "Alpha" }));
    expect(await screen.findByText(/hand-picked/i)).toBeInTheDocument();
    const reset = screen.getByRole("button", { name: /Reset to auto/i });

    fireEvent.click(reset);
    await waitFor(() => expect(screen.getByText(/tap to fine-tune/i)).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /Reset to auto/i })).not.toBeInTheDocument();
  });

  it("toggles visited from the header when a handler is wired", async () => {
    const onToggleVisited = vi.fn();
    renderView({ onToggleVisited });
    fireEvent.click(screen.getByRole("button", { name: "Testland (no rule)" }));
    await screen.findByText(/Who's going\?/i);
    fireEvent.click(screen.getByRole("button", { name: /Mark as visited/i }));
    expect(onToggleVisited).toHaveBeenCalledWith("Testland (no rule)");
  });

  it("toggles favorite from the header when a handler is wired", async () => {
    const onToggleFavorite = vi.fn();
    renderView({ onToggleFavorite, favoriteNames: new Set() });
    fireEvent.click(screen.getByRole("button", { name: "Testland (no rule)" }));
    await screen.findByText(/Who's going\?/i);
    fireEvent.click(screen.getByRole("button", { name: /Add to favorites/i }));
    expect(onToggleFavorite).toHaveBeenCalledWith("Testland (no rule)");
  });

  it("reflects an already-favorited destination in the header toggle", async () => {
    renderView({ onToggleFavorite: vi.fn(), favoriteNames: new Set(["Testland (no rule)"]) });
    fireEvent.click(screen.getByRole("button", { name: "Testland (no rule)" }));
    await screen.findByText(/Who's going\?/i);
    expect(screen.getByRole("button", { name: /Remove from favorites/i })).toBeInTheDocument();
  });
});

describe("PlanView — multi-country Basics", () => {
  const COUNTRY_B: Country = { ...COUNTRY, name: "Otherland (no rule)" };

  beforeEach(() => {
    localStorage.clear();
    setFeatureFlag("multiCountryPlanning", true);
  });

  function startMultiTrip() {
    render(
      <PlanView
        countries={[COUNTRY, COUNTRY_B]}
        visitedNames={new Set()}
        budgetBasis="couple"
        setBudgetBasis={vi.fn()}
        homeCountry="India"
        onGoDiscover={vi.fn()}
        onAddToList={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Testland \(no rule\)/i }));
    fireEvent.click(screen.getByRole("button", { name: /Otherland \(no rule\)/i }));
    fireEvent.click(screen.getByRole("button", { name: /Plan trip with 2 countries/i }));
  }

  it("shows the whole route and summed days, hiding country-scoped controls", async () => {
    startMultiTrip();
    await screen.findByText(/Who's going\?/i);
    // Route header + summary list both destinations.
    expect(screen.getAllByText(/Testland \(no rule\)/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Otherland \(no rule\)/).length).toBeGreaterThan(0);
    // Summed day estimate (7 + 7 fallback rec days).
    expect(screen.getByText(/~14 days/)).toBeInTheDocument();
    // Country-scoped controls are suppressed in multi mode.
    expect(screen.queryByRole("button", { name: /Add to favorites/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Mark as visited/i })).not.toBeInTheDocument();
    // No single-country vibe pills in multi mode.
    expect(screen.queryByText(/What are you into\?/i)).not.toBeInTheDocument();
  });

  it("adds all unsaved destinations to the list from the route banner", async () => {
    const onAddToList = vi.fn();
    // Empty My List → picks come from the explore tier, so they're all unsaved.
    render(
      <PlanView
        countries={[]}
        visitedNames={new Set()}
        budgetBasis="couple"
        setBudgetBasis={vi.fn()}
        homeCountry="India"
        onGoDiscover={vi.fn()}
        onAddToList={onAddToList}
      />,
    );
    const exploreSection = screen.getByText(/Popular to explore/i).closest("section")!;
    const chips = within(exploreSection).getAllByRole("button").slice(0, 2);
    const names = chips.map((c) => c.textContent?.replace(/[^\x00-\x7F]/g, "").trim() ?? "");
    fireEvent.click(chips[0]);
    fireEvent.click(chips[1]);
    fireEvent.click(screen.getByRole("button", { name: /Plan trip with 2 countries/i }));
    await screen.findByText(/Who's going\?/i);
    const addAll = screen.getByRole("button", { name: /Add 2 destinations to your list/i });
    fireEvent.click(addAll);
    expect(onAddToList).toHaveBeenCalledWith(names[0]);
    expect(onAddToList).toHaveBeenCalledWith(names[1]);
  });
});
