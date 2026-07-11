import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import PlanRouteSummary from "../components/views/plan/PlanRouteSummary";
import type { Country } from "../core/types";
import type { DestinationSource, DayBounds } from "../core/trip/destinationSource";

const mk = (name: string, region: string): Country => ({
  name,
  lat: 0,
  lng: 0,
  region,
  bestMonths: [],
  budget: "",
  experiences: [],
});

/** Fake source with per-name recommended days, so the timeline is deterministic. */
function fakeSource(days: Record<string, number>): DestinationSource {
  return {
    scope: "international",
    unitNoun: "country",
    unitNounPlural: "countries",
    popular: () => [],
    resolveUnit: () => null,
    comboRecommendations: () => [],
    dayBounds: (name: string): DayBounds => ({ rec: days[name] ?? 7, max: (days[name] ?? 7) + 3 }),
    experiencesFor: async () => [],
    loadUnit: async () => null,
  };
}

describe("PlanRouteSummary", () => {
  const selection = [mk("Norway", "Europe"), mk("Denmark", "Europe"), mk("Sweden", "Europe")];
  const source = fakeSource({ Norway: 19, Denmark: 3, Sweden: 10 });

  it("sums recommended days across the route", () => {
    render(<PlanRouteSummary selection={selection} source={source} />);
    expect(screen.getByText("~32 days")).toBeInTheDocument();
  });

  it("renders each leg in order with its day count", () => {
    render(<PlanRouteSummary selection={selection} source={source} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    ([["Norway", "19d"], ["Denmark", "3d"], ["Sweden", "10d"]] as const).forEach(([name, day], i) => {
      expect(items[i]).toHaveTextContent(name);
      expect(within(items[i]).getByText(day)).toBeInTheDocument();
    });
  });

  it("marks the single longest stay as the anchor", () => {
    render(<PlanRouteSummary selection={selection} source={source} />);
    const anchors = screen.getAllByText("Anchor");
    expect(anchors).toHaveLength(1);
    const item = anchors[0].closest("li")!;
    expect(within(item).getByText("Norway")).toBeInTheDocument();
  });

  it("uses the source unit nouns in the footer", () => {
    render(<PlanRouteSummary selection={selection} source={source} />);
    expect(screen.getByText(/3 countries · we'll fine-tune each stop next/)).toBeInTheDocument();
  });

  it("frames the totals as the plan so far and updates with live per-stop days", () => {
    render(<PlanRouteSummary selection={selection} source={source} />);
    expect(screen.getByText("planned so far")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /your trip so far, summed across every stop/i }),
    ).toBeInTheDocument();
  });

  it("prefers live per-stop days over the recommended baseline, re-totalling and re-anchoring", () => {
    render(
      <PlanRouteSummary
        selection={selection}
        source={source}
        stopDays={{ Norway: 5, Denmark: 3, Sweden: 12 }}
      />,
    );
    // Live days win over the 19/3/10 baseline → total 20, Sweden becomes anchor.
    expect(screen.getByText("~20 days")).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(within(items[0]).getByText("5d")).toBeInTheDocument();
    expect(within(items[2]).getByText("12d")).toBeInTheDocument();
    const anchorItem = screen.getByText("Anchor").closest("li")!;
    expect(within(anchorItem).getByText("Sweden")).toBeInTheDocument();
  });

  it("falls back to the recommended baseline for stops not yet loaded", () => {
    render(
      <PlanRouteSummary
        selection={selection}
        source={source}
        stopDays={{ Norway: 5 }}
      />,
    );
    // Norway live (5) + Denmark/Sweden baseline (3 + 10) = 18.
    expect(screen.getByText("~18 days")).toBeInTheDocument();
  });
});
