import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import PlanBasicsStep from "@/components/views/plan/steps/PlanBasicsStep";
import type { Country } from "@/core/types.ts";
import type { DestinationSource } from "@/core/trip/destinationSource.ts";

const SOURCE: DestinationSource = {
  scope: "international",
  unitNoun: "country",
  unitNounPlural: "countries",
  popular: () => [],
  resolveUnit: () => null,
  comboRecommendations: () => [],
  dayBounds: () => ({ rec: 7, max: 14 }),
  experiencesFor: async () => [],
  loadUnit: async () => null,
};

const UNIT: Country = { name: "Testland", lat: 0, lng: 0, budget: "₹1L", bestMonths: ["June"], experiences: [] };

// 14 tags — safely over the 10-pill cap.
const MANY = Array.from({ length: 14 }, (_, i) => `Vibe ${i + 1}`);

function renderStep(props: Partial<React.ComponentProps<typeof PlanBasicsStep>> = {}) {
  return render(
    <PlanBasicsStep
      selection={[UNIT]}
      source={SOURCE}
      budgetBasis="couple"
      setBudgetBasis={vi.fn()}
      experiences={MANY}
      selectedExperiences={[]}
      onToggleExperience={vi.fn()}
      onClearExperiences={vi.fn()}
      {...props}
    />,
  );
}

function vibeButtons() {
  const section = screen.getByText(/What are you into\?/i).closest("section")!;
  return within(section)
    .getAllByRole("button")
    .filter((b) => /^Vibe \d+$/.test(b.textContent ?? ""));
}

describe("PlanBasicsStep — vibe overflow", () => {
  it("caps visible pills and collapses the rest behind a '+N more' toggle", () => {
    renderStep();
    expect(vibeButtons()).toHaveLength(10);
    expect(screen.getByRole("button", { name: "+4 more" })).toBeInTheDocument();
  });

  it("expands to all pills then collapses again via the toggle", () => {
    renderStep();
    fireEvent.click(screen.getByRole("button", { name: "+4 more" }));
    expect(vibeButtons()).toHaveLength(14);
    const collapse = screen.getByRole("button", { name: "Show less" });
    expect(collapse).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(collapse);
    expect(vibeButtons()).toHaveLength(10);
  });

  it("keeps a selected tag visible even when it sits past the cap", () => {
    renderStep({ selectedExperiences: ["Vibe 13"] });
    // Collapsed: 10 leading pills + the selected out-of-range one.
    const labels = vibeButtons().map((b) => b.textContent);
    expect(labels).toContain("Vibe 13");
    // One fewer is truly hidden, so the toggle counts 3.
    expect(screen.getByRole("button", { name: "+3 more" })).toBeInTheDocument();
  });

  it("shows no toggle when the list fits within the cap", () => {
    renderStep({ experiences: MANY.slice(0, 8) });
    expect(vibeButtons()).toHaveLength(8);
    expect(screen.queryByRole("button", { name: /more|Show less/ })).not.toBeInTheDocument();
  });

  it("renders every tag with no toggle when capping is disabled (unbounded)", () => {
    renderStep({ visibleCap: Number.POSITIVE_INFINITY });
    // The scroll container — not the cap — keeps this contained, so all render.
    expect(vibeButtons()).toHaveLength(MANY.length);
    expect(screen.queryByRole("button", { name: /more|Show less/ })).not.toBeInTheDocument();
  });

  it("honors a raised cap", () => {
    renderStep({ visibleCap: 12 });
    expect(vibeButtons()).toHaveLength(12);
    expect(screen.getByRole("button", { name: "+2 more" })).toBeInTheDocument();
  });
});

describe("PlanBasicsStep — summary", () => {
  it("renders one molding route timeline for a single unit (N=1, no anchor badge)", () => {
    renderStep();
    expect(screen.getByText("Your trip")).toBeInTheDocument();
    expect(screen.getByText("Testland")).toBeInTheDocument();
    // A single stop has no anchor badge (nothing to anchor against).
    expect(screen.queryByText("Anchor")).not.toBeInTheDocument();
  });

  it("renders the same route timeline with every stop when the selection is a route", () => {
    renderStep({ selection: [UNIT, { ...UNIT, name: "Otherland" }] });
    expect(screen.getByText("Your trip")).toBeInTheDocument();
    expect(screen.getByText("Testland")).toBeInTheDocument();
    expect(screen.getByText("Otherland")).toBeInTheDocument();
  });

  it("changes the party size through the 'Who's going?' control", () => {
    const setBudgetBasis = vi.fn();
    renderStep({ budgetBasis: "solo", setBudgetBasis });
    const section = screen.getByText(/Who's going\?/i).closest("section")!;
    fireEvent.click(within(section).getByRole("radio", { name: /Couple/i }));
    expect(setBudgetBasis).toHaveBeenCalledWith("couple");
  });
});
