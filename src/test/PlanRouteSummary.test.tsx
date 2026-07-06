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

  it("frames the day totals as a recommended baseline", () => {
    render(<PlanRouteSummary selection={selection} source={source} />);
    expect(screen.getByText("recommended")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /recommended starting lengths for each stop/i }),
    ).toBeInTheDocument();
  });
});
