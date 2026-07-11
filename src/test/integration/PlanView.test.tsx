import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
  const onToggleTripFavorite = vi.fn();
  const utils = render(
    <PlanView
      countries={[COUNTRY]}
      visitedNames={new Set()}
      budgetBasis="couple"
      setBudgetBasis={setBudgetBasis}
      homeCountry="India"
      onGoDiscover={onGoDiscover}
      onToggleTripFavorite={onToggleTripFavorite}
      {...props}
    />,
  );
  return { setBudgetBasis, onGoDiscover, onToggleTripFavorite, ...utils };
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

  it("favorites the saved trip from the Review save bar (acts on the trip, not countries)", async () => {
    const onToggleFavorite = vi.fn();
    const { onToggleTripFavorite } = renderView({ onToggleFavorite });
    fireEvent.click(screen.getByRole("button", { name: "Testland (no rule)" }));
    await screen.findByText(/Who's going\?/i);
    // Advance to Review, where the trip auto-saves and the favorite toggle shows.
    goToReview();
    const favBtn = await screen.findByRole("button", { name: /Favorite this trip/i });
    fireEvent.click(favBtn);
    // Favoriting acts on the saved trip snapshot — never the country favorite set.
    expect(onToggleTripFavorite).toHaveBeenCalledWith("Testland (no rule)");
    expect(onToggleFavorite).not.toHaveBeenCalled();
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
    fireEvent.click(screen.getByRole("button", { name: /Plan another/i, hidden: true }));
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
    // Non-included cities sit behind a Show-more tail; reveal them to assert both.
    const showMore = screen.queryByRole("button", { name: /Show \d+ more places/i });
    if (showMore) fireEvent.click(showMore);
    expect(screen.getByRole("button", { name: "Alpha" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Beta" })).toBeInTheDocument();
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
    expect(screen.queryByRole("button", { name: /Reset to suggested/i })).not.toBeInTheDocument();

    // Hand-pick a city → manual selection appears with a reset affordance.
    const showMore = screen.queryByRole("button", { name: /Show \d+ more places/i });
    if (showMore) fireEvent.click(showMore);
    fireEvent.click(screen.getByRole("button", { name: "Alpha" }));
    const reset = await screen.findByRole("button", { name: /Reset to suggested/i });

    fireEvent.click(reset);
    await waitFor(() => expect(screen.queryByRole("button", { name: /Reset to suggested/i })).not.toBeInTheDocument());
  });

  it("prompts to resume when the picked country matches a saved trip; Resume opens it", async () => {
    const matchSavedTrip = vi.fn(() => ({
      id: "t1",
      name: "Testland (no rule)",
      stops: [{ country: "Testland (no rule)", days: 9, cities: ["Beta"] }],
      basis: "couple" as const,
      totalDays: 9,
      costPerPerson: "₹1L–₹2L",
      savedAt: "2026-01-01T00:00:00.000Z",
    }));
    renderView({ matchSavedTrip });
    fireEvent.click(screen.getByRole("button", { name: /Testland \(no rule\)/i }));
    const resumeBtn = await screen.findByRole("button", { name: /Resume saved plan/i });
    expect(screen.getByRole("button", { name: /Start fresh/i })).toBeInTheDocument();
    expect(matchSavedTrip).toHaveBeenCalledWith(["Testland (no rule)"]);
    fireEvent.click(resumeBtn);
    await waitFor(() => {
      expect(screen.queryByText(/Where do you plan to go next/i)).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getAllByText(/Beta/).length).toBeGreaterThan(0);
    });
  });

  it("starts fresh (basics) when 'Start fresh' is clicked on the resume prompt", async () => {
    const matchSavedTrip = vi.fn(() => ({
      id: "t1",
      name: "Testland (no rule)",
      stops: [{ country: "Testland (no rule)", days: 9, cities: ["Beta"] }],
      basis: "couple" as const,
      totalDays: 9,
      costPerPerson: "₹1L–₹2L",
      savedAt: "2026-01-01T00:00:00.000Z",
    }));
    renderView({ matchSavedTrip });
    fireEvent.click(screen.getByRole("button", { name: /Testland \(no rule\)/i }));
    const freshBtn = await screen.findByRole("button", { name: /Start fresh/i });
    fireEvent.click(freshBtn);
    // Fresh start leaves the landing picker for Basics (party size prompt).
    await waitFor(() => {
      expect(screen.queryByText(/Where do you plan to go next/i)).not.toBeInTheDocument();
    });
  });

  it("stays on the landing picker when the resume prompt is dismissed (Escape)", async () => {
    const matchSavedTrip = vi.fn(() => ({
      id: "t1",
      name: "Testland (no rule)",
      stops: [{ country: "Testland (no rule)", days: 9, cities: ["Beta"] }],
      basis: "couple" as const,
      totalDays: 9,
      costPerPerson: "₹1L–₹2L",
      savedAt: "2026-01-01T00:00:00.000Z",
    }));
    renderView({ matchSavedTrip });
    fireEvent.click(screen.getByRole("button", { name: /Testland \(no rule\)/i }));
    const resumeBtn = await screen.findByRole("button", { name: /Resume saved plan/i });
    // Dismiss via Escape on the dialog: neither resume nor start-fresh happens.
    fireEvent.keyDown(resumeBtn, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Resume saved plan/i })).not.toBeInTheDocument();
    });
    // Still on the landing picker — no plan was started.
    expect(screen.getByText(/Where do you plan to go next/i)).toBeInTheDocument();
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
    // No vibe pills: neither fake unit has rule data, so the union is empty.
    expect(screen.queryByText(/What are you into\?/i)).not.toBeInTheDocument();
  });

  it("summarizes a long route in the header with a '+N' pill and full aria-label", async () => {
    const units: Country[] = ["Alphaland", "Betaland", "Gammaland", "Deltaland"].map((name) => ({
      name, lat: 0, lng: 0, budget: "₹1L", bestMonths: ["June"], experiences: [],
    }));
    render(
      <PlanView
        countries={units}
        visitedNames={new Set()}
        budgetBasis="couple"
        setBudgetBasis={vi.fn()}
        homeCountry="India"
        onGoDiscover={vi.fn()}
      />,
    );
    for (const u of units) fireEvent.click(screen.getByRole("button", { name: new RegExp(u.name, "i") }));
    fireEvent.click(screen.getByRole("button", { name: /Plan trip with 4 countries/i }));
    await screen.findByText(/Who's going\?/i);
    // Header names only the first two stops, then collapses the rest.
    const heading = screen.getByRole("heading", {
      name: /Planning a route through Alphaland, Betaland, Gammaland, Deltaland/i,
    });
    expect(heading).toHaveTextContent("+2");
    expect(heading).not.toHaveTextContent("Gammaland");
    // The "+N" pill is an interactive affordance: revealing it exposes the full
    // ordered route so a sighted user can recall every stop at any step.
    const morePill = screen.getByRole("button", { name: /Alphaland.*Betaland.*Gammaland.*Deltaland/i });
    fireEvent.click(morePill);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(/Gammaland/);
  });

  it("shows union vibe pills for a multi-unit route with rule-backed data", async () => {
    render(
      <PlanView
        countries={[
          { name: "Norway", lat: 60, lng: 8, budget: "₹1L", bestMonths: ["June"], experiences: [] },
          { name: "Sweden", lat: 60, lng: 15, budget: "₹1L", bestMonths: ["June"], experiences: [] },
        ]}
        visitedNames={new Set()}
        budgetBasis="couple"
        setBudgetBasis={vi.fn()}
        homeCountry="India"
        onGoDiscover={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^Norway/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Sweden/i }));
    fireEvent.click(screen.getByRole("button", { name: /Plan trip with 2 countries/i }));
    // Vibe section appears once the union of both countries' experiences loads.
    expect(await screen.findByText(/What are you into\?/i)).toBeInTheDocument();
  });

  it("persists the whole route as a saved trip snapshot once it reaches Review", async () => {
    const onSaveTrip = vi.fn();
    render(
      <PlanView
        countries={[COUNTRY, COUNTRY_B]}
        visitedNames={new Set()}
        budgetBasis="couple"
        setBudgetBasis={vi.fn()}
        homeCountry="India"
        onGoDiscover={vi.fn()}
        onSaveTrip={onSaveTrip}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Testland \(no rule\)/i }));
    fireEvent.click(screen.getByRole("button", { name: /Otherland \(no rule\)/i }));
    fireEvent.click(screen.getByRole("button", { name: /Plan trip with 2 countries/i }));
    await screen.findByText(/Who's going\?/i);
    // Advance to Review; the route persists as a snapshot on arrival.
    for (let i = 0; i < 5; i++) {
      const btn = screen.queryByRole("button", { name: /Continue|See my plan|Review my trip/i });
      if (!btn) break;
      fireEvent.click(btn);
    }
    await waitFor(() => {
      const calls = onSaveTrip.mock.calls;
      const last = calls[calls.length - 1]?.[0];
      expect(last?.stops.map((s: { country: string }) => s.country)).toEqual([
        "Testland (no rule)",
        "Otherland (no rule)",
      ]);
    });
    const calls = onSaveTrip.mock.calls;
    const snap = calls[calls.length - 1][0];
    expect(snap).toMatchObject({
      name: "Testland (no rule) → Otherland (no rule)",
      basis: "couple",
    });
  });

  it("jumps to the review step when opening a saved trip", async () => {
    renderView({ openTrip: { stops: [{ country: "Testland (no rule)", days: 6, cities: [] }], basis: "couple", nonce: 1 } });
    await waitFor(() => {
      expect(screen.queryByText(/Where do you plan to go next/i)).not.toBeInTheDocument();
    });
  });

  it("restores a saved trip's tuned length and cities on open", async () => {
    renderView({
      openTrip: { stops: [{ country: "Testland (no rule)", days: 9, cities: ["Beta"] }], basis: "couple", nonce: 3 },
    });
    await waitFor(() => {
      expect(screen.queryByText(/Where do you plan to go next/i)).not.toBeInTheDocument();
    });
    // The restored, hand-picked city surfaces in the plan (Beta was snapshotted).
    await waitFor(() => {
      expect(screen.getAllByText(/Beta/).length).toBeGreaterThan(0);
    });
  });

  it("defers opening a saved trip until its destination data resolves", async () => {
    const openTrip = { stops: [{ country: "Testland (no rule)", days: 6, cities: [] }], basis: "couple" as const, nonce: 7 };
    // Destination data not ready yet: the name resolves to nothing, so the open
    // must NOT be consumed — the landing picker stays put.
    const { rerender } = renderView({ countries: [], openTrip });
    expect(screen.getByText(/Where do you plan to go next/i)).toBeInTheDocument();
    // Data lands (same nonce): the effect re-runs and finally opens to review.
    rerender(
      <PlanView
        countries={[COUNTRY]}
        visitedNames={new Set()}
        budgetBasis="couple"
        setBudgetBasis={vi.fn()}
        homeCountry="India"
        onGoDiscover={vi.fn()}
        onToggleTripFavorite={vi.fn()}
        openTrip={openTrip}
      />,
    );
    await waitFor(() => {
      expect(screen.queryByText(/Where do you plan to go next/i)).not.toBeInTheDocument();
    });
  });
});
