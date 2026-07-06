import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import PlanPlacesStep, { type PlacesUnit } from "../components/views/plan/PlanPlacesStep";
import type { BudgetBasis } from "../core/utils/budget";
import type { TripPlan } from "../core/utils/tripPlans";
import type { CountryRule } from "../core/data/itineraryRules";

type RuleDay = CountryRule["cities"][string]["days"][number];
const day = (t: string): RuleDay => ({ theme: t, activities: [{ name: "Walk" }] });

function ruleFor(cities: { name: string; recDays: number; signature?: string[] }[]): CountryRule {
  const map: CountryRule["cities"] = {};
  for (const c of cities) {
    map[c.name] = {
      name: c.name,
      minDays: 1,
      recDays: c.recDays,
      maxDays: c.recDays + 2,
      signatureExperiences: c.signature,
      days: [day("T0")],
    };
  }
  return { cityOrder: cities.map((c) => c.name), cities: map, connections: [] };
}

function makeUnit(name: string, cities: string[], over: Partial<PlacesUnit> = {}): PlacesUnit {
  return {
    name,
    orderedCities: cities.map((c, i) => ({ name: c, lat: i, lng: i })),
    selectedCities: [],
    autoSelectedCities: cities,
    customDays: 7,
    activeExperiences: [],
    experienceOptions: [],
    rule: ruleFor(cities.map((c, i) => ({ name: c, recDays: i + 1 }))),
    onToggleCity: vi.fn(),
    onClearCities: vi.fn(),
    onToggleExperience: vi.fn(),
    onClearExperiences: vi.fn(),
    ...over,
  };
}

const PLAN: TripPlan = {
  duration: "10 days",
  costPerPerson: "₹3L – ₹5L",
  days: [{ label: "Day 1 — Somewhere", activities: ["x"] }],
  note: "route",
  costBasis: "couple",
};

function renderStep(
  units: PlacesUnit[],
  opts: { basis?: BudgetBasis; setBudgetBasis?: (b: BudgetBasis) => void } = {},
) {
  return render(
    <PlanPlacesStep
      units={units}
      plan={PLAN}
      budgetBasis={opts.basis ?? "couple"}
      setBudgetBasis={opts.setBudgetBasis ?? vi.fn()}
    />,
  );
}

describe("PlanPlacesStep", () => {
  it("renders a single stop with its static name, heading, and no country switcher", () => {
    renderStep([makeUnit("Norway", ["Oslo", "Bergen"])]);
    expect(screen.queryByRole("button", { name: /Switch country/i })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Cities in Norway/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Oslo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bergen" })).toBeInTheDocument();
  });

  it("shows one country at a time in a multi-stop route and switches on demand", () => {
    renderStep([
      makeUnit("Norway", ["Oslo"], { customDays: 8 }),
      makeUnit("Denmark", ["Copenhagen"], { customDays: 4 }),
    ]);
    expect(screen.getByRole("heading", { name: /Cities in Norway/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Oslo" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copenhagen" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Switch country/i }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: /Denmark/i }));
    expect(screen.getByRole("heading", { name: /Cities in Denmark/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copenhagen" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Oslo" })).not.toBeInTheDocument();
  });

  it("shows the countries stat only for a multi-stop route", () => {
    const { rerender } = renderStep([makeUnit("Norway", ["Oslo"])]);
    expect(screen.queryByText(/countries/i)).not.toBeInTheDocument();
    rerender(
      <PlanPlacesStep
        units={[makeUnit("Norway", ["Oslo"]), makeUnit("Denmark", ["Copenhagen"])]}
        plan={PLAN}
        budgetBasis="couple"
        setBudgetBasis={vi.fn()}
      />,
    );
    expect(screen.getByText(/countries/i)).toBeInTheDocument();
  });

  it("changes the trip-scoped who's-going basis", () => {
    const setBudgetBasis = vi.fn();
    renderStep([makeUnit("Norway", ["Oslo"])], { setBudgetBasis });
    fireEvent.click(screen.getByRole("button", { name: /Who's going/i }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: /Solo/i }));
    expect(setBudgetBasis).toHaveBeenCalledWith("solo");
  });

  it("shows Reset-to-suggested only for a hand-picked active stop and wires it", () => {
    const onClearCities = vi.fn();
    renderStep([makeUnit("Norway", ["Oslo", "Bergen"], { selectedCities: ["Oslo"], onClearCities })]);
    fireEvent.click(screen.getByRole("button", { name: /Reset to suggested/i }));
    expect(onClearCities).toHaveBeenCalledOnce();
  });

  it("toggles a city from its decision card", () => {
    const onToggleCity = vi.fn();
    renderStep([makeUnit("Norway", ["Oslo", "Bergen"], { onToggleCity })]);
    fireEvent.click(screen.getByRole("button", { name: "Bergen" }));
    expect(onToggleCity).toHaveBeenCalledWith("Bergen");
  });

  it("renders a decision card's brief, avoid window, and focus-matched chip (D3)", () => {
    const unit = makeUnit("Norway", ["Tromso"], {
      orderedCities: [
        {
          name: "Tromso",
          lat: 0,
          lng: 0,
          notes: "Arctic aurora gateway",
          bestMonths: ["December", "January"],
          worstMonths: ["June", "July"],
          experiences: ["Northern Lights", "Fjords"],
        },
      ],
      autoSelectedCities: ["Tromso"],
      activeExperiences: ["Northern Lights"],
    });
    renderStep([unit]);
    const card = screen.getByRole("button", { name: /Tromso — matches Northern Lights/i });
    expect(within(card).getByText("Arctic aurora gateway")).toBeInTheDocument();
    expect(within(card).getByText(/⚠/)).toBeInTheDocument();
    expect(within(card).getByText(/☀/)).toBeInTheDocument();
    // The focus-matched experience is surfaced as a chip on the card.
    expect(within(card).getByText("Northern Lights")).toBeInTheDocument();
  });

  it("collapses non-included cities behind a Show-more tail and reveals them", () => {
    renderStep([makeUnit("Norway", ["Oslo", "Bergen", "Tromsø"], { autoSelectedCities: ["Oslo"] })]);
    expect(screen.getByRole("button", { name: "Oslo" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Bergen" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Show 2 more places in Norway/i }));
    expect(screen.getByRole("button", { name: "Bergen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tromsø" })).toBeInTheDocument();
  });

  it("surfaces per-city decision meta (recommended days + best window + signal)", () => {
    renderStep([
      makeUnit("Norway", ["Bergen"], {
        orderedCities: [{ name: "Bergen", lat: 0, lng: 0, experiences: ["Fjords"], bestMonths: ["May", "June", "July"] }],
        activeExperiences: ["Fjords"],
        rule: ruleFor([{ name: "Bergen", recDays: 2, signature: ["Fjords"] }]),
      }),
    ]);
    const card = screen.getByRole("button", { name: /Bergen/i });
    expect(within(card).getByText(/≈2d/)).toBeInTheDocument();
    expect(within(card).getByText(/☀ May–Jul/)).toBeInTheDocument();
    expect(within(card).getByText(/Top for Fjords/)).toBeInTheDocument();
  });

  it("re-sorts cities to fewest days on demand", () => {
    renderStep([makeUnit("Norway", ["Oslo", "Bergen", "Tromsø"])]);
    fireEvent.click(screen.getByRole("button", { name: /Sort places/i }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: /Fewest days/i }));
    const cards = screen.getAllByRole("button", { name: /^(Oslo|Bergen|Tromsø)$/ });
    expect(cards[0]).toHaveAccessibleName("Oslo");
  });

  it("summarizes the active stop's focus in the section subline", () => {
    renderStep([
      makeUnit("Norway", ["Oslo"], { activeExperiences: ["Fjords", "Food", "History", "Hiking"] }),
    ]);
    expect(screen.getByText(/Fjords, Food, History \+1 more/)).toBeInTheDocument();
  });

  it("opens per-country Filters and toggles an experience for that stop", () => {
    const onToggleExperience = vi.fn();
    renderStep([
      makeUnit("Norway", ["Oslo"], { experienceOptions: ["Fjords", "Food"], onToggleExperience }),
    ]);
    fireEvent.click(screen.getByRole("button", { name: /Filters for Norway/i }));
    fireEvent.click(screen.getByRole("button", { name: "Fjords" }));
    expect(onToggleExperience).toHaveBeenCalledWith("Fjords");
  });

  it("hides the Filters control when the active stop offers no experience tags", () => {
    renderStep([makeUnit("Norway", ["Oslo"], { experienceOptions: [] })]);
    expect(screen.queryByRole("button", { name: /Filters for/i })).not.toBeInTheDocument();
  });
});
