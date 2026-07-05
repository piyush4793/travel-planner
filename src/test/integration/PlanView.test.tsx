import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import PlanView from "../../components/views/plan/PlanView";
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
  const onOpenCountry = vi.fn();
  const onGoDiscover = vi.fn();
  const onAddToList = vi.fn();
  render(
    <PlanView
      countries={[COUNTRY]}
      visitedNames={new Set()}
      budgetBasis="couple"
      setBudgetBasis={setBudgetBasis}
      onOpenCountry={onOpenCountry}
      onGoDiscover={onGoDiscover}
      onAddToList={onAddToList}
      {...props}
    />,
  );
  return { setBudgetBasis, onOpenCountry, onGoDiscover, onAddToList };
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
    expect(screen.getByText(/Step 1 of/i)).toBeInTheDocument();
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
      expect(screen.getByRole("button", { name: /Full details for Testland/i })).toBeInTheDocument(),
    );
  });

  it("opens full details from the review step", async () => {
    const { onOpenCountry } = renderView();
    fireEvent.click(screen.getByRole("button", { name: "Testland (no rule)" }));
    await screen.findByText(/Who's going\?/i);
    goToReview();
    const details = await screen.findByRole("button", { name: /Full details for Testland/i });
    fireEvent.click(details);
    expect(onOpenCountry).toHaveBeenCalledWith(expect.objectContaining({ name: COUNTRY.name }));
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
    fireEvent.click(screen.getByRole("button", { name: /Back/i }));
    expect(await screen.findByText(/Who's going\?/i)).toBeInTheDocument();
  });

  it("shows the AI fork on review when onPlanWithAi is provided", async () => {
    const onPlanWithAi = vi.fn();
    renderView({ onPlanWithAi });
    fireEvent.click(screen.getByRole("button", { name: "Testland (no rule)" }));
    await screen.findByText(/Who's going\?/i);
    goToReview();
    const aiBtn = await screen.findByRole("button", { name: /Plan with your own AI/i });
    fireEvent.click(aiBtn);
    expect(onPlanWithAi).toHaveBeenCalledWith(COUNTRY.name);
  });
});
