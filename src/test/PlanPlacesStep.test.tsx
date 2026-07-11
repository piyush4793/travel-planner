import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import PlanPlacesStep, { type PlacesUnit } from "../components/views/plan/PlanPlacesStep";
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

function renderStep(units: PlacesUnit[], activeIndex = 0) {
  return render(<PlanPlacesStep units={units} activeIndex={activeIndex} />);
}

describe("PlanPlacesStep", () => {
  it("renders a single stop with its heading and no country switcher (switcher lives in the header)", () => {
    renderStep([makeUnit("Norway", ["Oslo", "Bergen"])]);
    expect(screen.queryByRole("button", { name: /Switch country/i })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Cities in Norway/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Oslo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bergen" })).toBeInTheDocument();
  });

  it("renders only the controlled active country's cities in a multi-stop route", () => {
    const units = [
      makeUnit("Norway", ["Oslo"], { customDays: 8 }),
      makeUnit("Denmark", ["Copenhagen"], { customDays: 4 }),
    ];
    const { rerender } = renderStep(units, 0);
    expect(screen.getByRole("heading", { name: /Cities in Norway/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Oslo" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copenhagen" })).not.toBeInTheDocument();

    rerender(<PlanPlacesStep units={units} activeIndex={1} />);
    expect(screen.getByRole("heading", { name: /Cities in Denmark/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copenhagen" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Oslo" })).not.toBeInTheDocument();
  });

  it("clamps an out-of-range active index to the last stop", () => {
    renderStep([makeUnit("Norway", ["Oslo"]), makeUnit("Denmark", ["Copenhagen"])], 9);
    expect(screen.getByRole("heading", { name: /Cities in Denmark/i })).toBeInTheDocument();
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
    // The card is a container; the toggle keeps the decision's accessible name.
    const card = screen.getByRole("button", { name: /Tromso — matches Northern Lights/i }).parentElement as HTMLElement;
    expect(within(card).getByText("Arctic aurora gateway")).toBeInTheDocument();
    expect(within(card).getByText(/⚠/)).toBeInTheDocument();
    expect(within(card).getByText(/☀/)).toBeInTheDocument();
    // The focus-matched experience is surfaced as a chip on the card.
    expect(within(card).getByText("Northern Lights")).toBeInTheDocument();
  });

  it("opens a city detail modal from the card's info affordance and toggles from it", () => {
    const onToggleCity = vi.fn();
    renderStep([
      makeUnit("Norway", ["Tromso"], {
        orderedCities: [
          {
            name: "Tromso",
            lat: 0,
            lng: 0,
            notes: "Arctic aurora gateway with the Arctic Cathedral",
            bestMonths: ["December", "January"],
            worstMonths: ["June"],
            experiences: ["Northern Lights"],
          },
        ],
        autoSelectedCities: ["Tromso"],
        rule: ruleFor([{ name: "Tromso", recDays: 3 }]),
        onToggleCity,
      }),
    ]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tromso details" }));
    const dialog = screen.getByRole("dialog", { name: /Tromso details/i });
    expect(within(dialog).getByText("Arctic aurora gateway with the Arctic Cathedral")).toBeInTheDocument();
    expect(within(dialog).getByText(/3 nights/i)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: /In your plan — tap to remove/i }));
    expect(onToggleCity).toHaveBeenCalledWith("Tromso");
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
    const card = screen.getByRole("button", { name: /Bergen — matches Fjords/i });
    expect(within(card.parentElement as HTMLElement).getByText(/≈2d/)).toBeInTheDocument();
    expect(screen.getByText(/☀ May–Jul/)).toBeInTheDocument();
    expect(screen.getByText(/Top for Fjords/)).toBeInTheDocument();
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
