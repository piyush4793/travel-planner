import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import PlanBasicsStep from "../components/views/plan/PlanBasicsStep";
import type { Country } from "../core/types";
import type { DestinationSource } from "../core/trip/destinationSource";

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
      plan={null}
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

describe("PlanBasicsStep — summary branch", () => {
  it("renders the single-destination progress readout when one unit has a live plan", () => {
    renderStep({
      plan: {
        duration: "3 days",
        costPerPerson: "₹1.2L – ₹2L",
        days: [
          { label: "Day 1 — Oslo", activities: [] },
          { label: "Day 2 — Bergen", activities: [] },
        ],
        note: "",
        costBasis: "couple",
      },
    });
    expect(screen.getByText("Your trip so far")).toBeInTheDocument();
    expect(screen.getByText("2 days")).toBeInTheDocument();
    expect(screen.getByText("Oslo")).toBeInTheDocument();
  });

  it("renders the multi-stop route timeline when the selection has more than one unit", () => {
    renderStep({ selection: [UNIT, { ...UNIT, name: "Otherland" }], plan: null });
    expect(screen.getByText("Your route")).toBeInTheDocument();
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
